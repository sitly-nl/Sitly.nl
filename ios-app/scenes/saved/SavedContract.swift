import Foundation

protocol SavedPresenterProtocol: AnyObject {
    func viewDidLoad()
    func getFavorites()
    func remove(favorite: User)
    var forceHidePremium: Bool { get }
}

protocol SavedView: BaseViewProtocol {
    func updateView(for favorites: [User])
    func noDataView()
}
