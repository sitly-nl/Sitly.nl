import UIKit

class FiltersViewController: BaseViewController {
    var presenter: FiltersPresenterProtocol!

    @IBOutlet weak var filtersCollectionView: UICollectionView!
    @IBOutlet weak var clearButton: RoundedButton!
    @IBOutlet weak var showResultsButton: UIButton!
    @IBOutlet var restoreFilters: UIButton!

    var searchForm: SearchForm?
    var filters = [FilterType]()

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true

        searchForm = presenter.searchForm
        searchForm.flatMap {
            setUpFiltersFor(role: $0.role)
        }

        let bottomInset = showResultsButton.frame.height
        var inset = filtersCollectionView.contentInset
        inset.bottom = bottomInset + 10

        if searchForm?.hasPreviousFilters() ?? false {
            inset.bottom += 10
        } else {
            restoreFilters.isHidden = true
        }

        filtersCollectionView.contentInset = inset

        clearButton.setTitle("    \("reset".localized)    ", for: .normal)
        restoreFilters.setTitle("restorePreviousFilters".localized, for: .normal)

        var scrollInsets = filtersCollectionView.verticalScrollIndicatorInsets
        scrollInsets.bottom = bottomInset
        filtersCollectionView.verticalScrollIndicatorInsets = scrollInsets

        if let flowLayout = filtersCollectionView?.collectionViewLayout as? UICollectionViewFlowLayout {
            flowLayout.estimatedItemSize = UICollectionViewFlowLayout.automaticSize
        }
    }

    override func connectionStatusChanged(connected: Bool) {
        filtersCollectionView.reloadData()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    @IBAction func close(_ sender: Any) {
        dismiss(animated: true)
    }

    @IBAction func clearFilter(_ sender: Any) {
        presenter?.resetSearchForm()
    }

    @IBAction func restorePreviousFilters(_ sender: Any) {
        restoreFilters.isHidden = true
        presenter?.restoreFilters()
    }

    func setUpFiltersFor(role: Role) {
        switch role {
        case .babysitter:
            filters = [
                .header, .role, .sort, .distance, .lastSeen, .availability,
                .resume, .hourlyRate, .gender, .ageGroup, .nativeLanguage, .speaksLanguage, .chores
            ]
        case .childminder:
            filters = [
                .header, .role, .sort, .distance, .lastSeen, .availability,
                .location, .resume, .hourlyRate, .gender, .ageGroup, .nativeLanguage, .speaksLanguage, .chores
            ]
        case .parent:
            filters = [.header, .sort, .lastSeen, .availability, .children, .age, .distance]
        }

        if searchForm?.searchType == .map {
            filters.removeAll { item in
                return item == .distance || item == .sort
            }
        }

        filters.forEach {
            filtersCollectionView.registerNib(identifier: String(describing: $0.collectionViewCell))
        }
    }
}

// MARK: - FiltersView
extension FiltersViewController: FiltersView {
    func updateTotal(total: Int) {
        loadViewIfNeeded()

        searchForm.flatMap {
            showResultsButton.setTitle($0.role.seeText(total: total), for: .normal)
        }
    }

    func updateFilter(searchForm: SearchForm) {
        // Reload collectionview
        self.searchForm = searchForm
        setUpFiltersFor(role: searchForm.role)
        filtersCollectionView.reloadData()
    }
}

// MARK: - UICollectionViewDataSource
extension FiltersViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return filters.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let filter = filters[indexPath.item]
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: String(describing: filter.collectionViewCell), for: indexPath)

        if let cell = cell as? FilterHourlyRateCollectionViewCell {
            cell.hourlyRates = presenter.configuration.flatMap { Array($0.hourlyRates) } ?? []
        }

        if let cell = cell as? FilterCell, let searchForm = searchForm {
            cell.configure(searchForm: searchForm, delegate: self)
        }

        cell.isUserInteractionEnabled = Reachability.isOnline

        return cell
    }
}

// MARK: - FilterDelegate
extension FiltersViewController: FilterDelegate {
    func didUpdateFilter(searchForm: SearchForm?, switchedRole: Bool) {
        guard let form = searchForm else {
            return
        }

        searchForm?.save()

        if switchedRole {
            // Reload collectionview
            setUpFiltersFor(role: form.role)
            filtersCollectionView.reloadData()
        }

        // Search
        presenter?.search(searchForm: form)
    }

    func updateAvailability(_ availability: Availability) {
        presenter?.updateAvailability(availability)
    }

    func reloadDate() {
        filtersCollectionView.reloadData()
    }
}
