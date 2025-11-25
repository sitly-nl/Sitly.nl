import UIKit

class FiltersWireframe {
    func presentFrom(viewController: UIViewController, searchForm: SearchForm, delegate: FilterUpdateDelegate?, total: Int) {
        let filtersVc = UIStoryboard.search.instantiateViewController(ofType: FiltersViewController.self)!

        let filtersPresenter = FiltersPresenter(view: filtersVc, searchForm: searchForm, userService: UserService(), configService: ConfigService())
        filtersPresenter.delegate = delegate

        filtersVc.presenter = filtersPresenter
        delegate?.delegate = filtersPresenter
        filtersVc.updateTotal(total: total)

        viewController.present(filtersVc, animated: true)

        var event = AnalyticEvent.filterChangedParent
        switch filtersPresenter.currentUser?.role {
        case .babysitter?:
            event = .filterChangedBabysitter
        case .childminder?:
            event = .filterChangedChildminder
        default:
            break
        }
        AnalyticsManager.logEvent(event, parameters: searchForm.analyticDictionaryRepresentation)
    }
}
