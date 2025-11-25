import UIKit

struct StartFeature {
    var image: UIImage
    var title: String
}

class StartViewController: BaseViewController {
    var presenter: StartPresenterProtocol!

    @IBOutlet private weak var signupButton: UIButton!
    @IBOutlet private weak var loginButton: UIButton!
    @IBOutlet private weak var featuresCollectionView: UICollectionView!
    @IBOutlet private weak var pageControl: UIPageControl!
    @IBOutlet private weak var buttonsStackView: UIStackView!

    private var features = [StartFeature(image: #imageLiteral(resourceName: "Start0"), title: "startFeature0".localized),
                            StartFeature(image: #imageLiteral(resourceName: "Start1"), title: "startFeature1".localized),
                            StartFeature(image: #imageLiteral(resourceName: "Start2"), title: "startFeature2".localized),
                            StartFeature(image: #imageLiteral(resourceName: "Start3"), title: "startFeature3".localized)]
    private var timer = Timer()

    deinit {
        timer.invalidate()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        signupButton.setTitle("imNew".localized, for: .normal)
        loginButton.setTitle("imAlreadyAMember".localized, for: .normal)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startTimer()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        timer.invalidate()
    }

    func startTimer() {
        timer = Timer.scheduledTimer(timeInterval: 5, target: self, selector: #selector(scrollToNextPage), userInfo: nil, repeats: true)
    }

// MARK: - Actions
    @IBAction func showLogin(_ sender: Any) {
        presenter.showSignIn?()
    }

    @IBAction func showSignup(_ sender: Any) {
        presenter.showSignUp?()
    }

    @objc func scrollToNextPage() {
        let nextPage = pageControl.currentPage + 1 < features.count ? pageControl.currentPage + 1 : 0

        featuresCollectionView.scrollToItem(at: IndexPath(item: nextPage, section: 0), at: .centeredHorizontally, animated: true)
    }
}

extension StartViewController: StartView {}

// MARK: - UICollectionViewDataSource
extension StartViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        pageControl.numberOfPages = features.count
        return features.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: StartFeatureCollectionViewCell.self, for: indexPath)

        cell.configure(feature: features[indexPath.item])

        return cell
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension StartViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        return CGSize(width: collectionView.frame.width, height: collectionView.frame.height)
    }
}

// MARK: - UIScrollViewDelegate
extension StartViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        pageControl.currentPage = Int(scrollView.contentOffset.x / scrollView.frame.size.width)
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        timer.invalidate()
        startTimer()
    }
}
