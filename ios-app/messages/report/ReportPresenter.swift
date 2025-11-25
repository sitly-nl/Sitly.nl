import Foundation

class ReportPresenter: ServerServiceInjected {
    weak var view: ReportView?
    let onDismiss: VoidClosure?

    init(view: ReportView, onDismiss: VoidClosure?) {
        self.view = view
        self.onDismiss = onDismiss
    }
}

// MARK: - ReportPresenterProtocol
extension ReportPresenter: ReportPresenterProtocol {
    func report(reason: String, user: User) {
        serverManager.reportUser(id: user.id, type: .general(reason)) { _ in }
    }
}
