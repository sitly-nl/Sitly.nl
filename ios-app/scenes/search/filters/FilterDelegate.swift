import Foundation

protocol FilterDelegate: AnyObject {
    func didUpdateFilter(searchForm: SearchForm?, switchedRole: Bool)
    func updateAvailability(_ availability: Availability)
    func reloadDate()
}

extension FilterDelegate {
    func didUpdateFilter(searchForm: SearchForm?) {
        didUpdateFilter(searchForm: searchForm, switchedRole: false)
    }
}
