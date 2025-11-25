import Foundation

protocol HelpPresenterProtocol: BasePresenterProtocol {
    func getContactUrl()
}

protocol HelpView: BaseViewProtocol {
    var contactUrl: URL? { get set }
}
