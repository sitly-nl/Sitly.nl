import Foundation

protocol ReportPresenterProtocol: AnyObject {
    func report(reason: String, user: User)
    var onDismiss: VoidClosure? { get }
}

protocol ReportView: BaseViewProtocol {
}
