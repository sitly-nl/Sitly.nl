import Foundation

class FiltersPresenter: BasePresenter {
    weak var view: FiltersView?
    let userService: UserServiceable
    let configService: ConfigServiceable
    var searchForm: SearchForm
    weak var delegate: FilterUpdateDelegate?
    var configuration: Configuration? {
        return configService.fetch()
    }

    init(view: FiltersView, searchForm: SearchForm, userService: UserServiceable, configService: ConfigServiceable) {
        self.userService = userService
        self.searchForm = searchForm
        self.configService = configService
        super.init(baseView: view)
        self.view = view
    }
}

// MARK: - FiltersPresenterProtocol
extension FiltersPresenter: FiltersPresenterProtocol {
    func search(searchForm: SearchForm) {
        self.searchForm = searchForm
        searchForm.page = 1
        delegate?.search(searchForm: searchForm)
    }

    func updateAvailability(_ availability: Availability) {
        userService.updateMe(type: .availability(isParent: currentUser?.isParent ?? false, availability), completion: { _ in })
    }

    func resetSearchForm() {
        delegate?.resetSearchForm()
    }

    func restoreFilters() {
        searchForm.restored(force: true).flatMap {
            search(searchForm: $0)
            view?.updateFilter(searchForm: $0)
        }
    }
}

// MARK: - SearchResultsHandler
extension FiltersPresenter: SearchResultsHandler {
    func found(total: Int) {
        view?.updateTotal(total: total)
    }

    func didResetSearchForm(form: SearchForm) {
        self.searchForm = form
        view?.updateFilter(searchForm: form)
    }
}
