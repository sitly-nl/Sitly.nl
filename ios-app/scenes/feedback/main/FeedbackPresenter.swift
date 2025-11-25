import Foundation

class FeedbackPresenter: ServerServiceInjected {
    weak var view: FeedbackView?
    var showHelp: (() -> Void)?

    init(view: FeedbackView) {
        self.view = view
    }
}

// MARK: - FeedbackPresenterProtocol
extension FeedbackPresenter: FeedbackPresenterProtocol {
    func send(feedback: String) {
        serverManager.postFeedback(description: feedback) { _ in }
    }
}
