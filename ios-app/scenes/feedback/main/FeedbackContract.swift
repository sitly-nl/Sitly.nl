import Foundation

protocol FeedbackPresenterProtocol: AnyObject {
    var showHelp: (() -> Void)? { get set }
    func send(feedback: String)
}

protocol FeedbackView: BaseViewProtocol {
}
