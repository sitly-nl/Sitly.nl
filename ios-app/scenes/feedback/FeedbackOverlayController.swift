import UIKit

class FeedbackOverlayController: OverlayController {
    let userService: UserServiceable = UserService()

    var showFeedbackOptions: (() -> Void)?
    var forSatisfiedUser: Bool = false {
        didSet {
            if !forSatisfiedUser {
                if let superview = view.subviews.last {
                    let button = addCloseButton(superview: superview)
                    button.addTarget(self, action: #selector(onClosePressed), for: .touchUpInside)
                }
            }
        }
    }

    override func showInitialView() {
        let view = OverlayView(
            title: "feedbackOverlay.main.title".localized,
            firstAction: OverlayView.Action(title: "Not really".localized, action: { [weak self] in
                self?.showFeedback()
            }),
            secondAction: OverlayView.Action(title: "Yes!".localized, action: { [weak self] in
                self?.showAppstore()
            })
        )
        loadViewToContainer(view)
    }

    private func showFeedback() {
        let view = OverlayView(
            title: "feedbackOverlay.unsatisfied.title".localized,
            firstAction: OverlayView.Action(title: "No thanks".localized, action: { [weak self] in
                self?.postActionWithOverlay(accepted: false)
                self?.close()
            }),
            secondAction: OverlayView.Action(title: "Sure!".localized, action: { [weak self] in
                self?.postActionWithOverlay(accepted: true)
                self?.showFeedbackOptions?()
                self?.close()
            })
        )
        loadViewToContainer(view)
    }

    private func showAppstore() {
        let view = OverlayView(
            title: "feedbackOverlay.appStore.title".localized,
            firstAction: OverlayView.Action(title: "No thanks".localized, action: { [weak self] in
                self?.postActionWithOverlay(accepted: false)
                self?.close()
            }),
            secondAction: OverlayView.Action(title: "Sure!".localized, action: { [weak self] in
                self?.postActionWithOverlay(accepted: true)
                Router.showAppRating()
                self?.close()
            })
        )
        loadViewToContainer(view)
    }

    private func postActionWithOverlay(accepted: Bool) {
        userService.updateMe(type: forSatisfiedUser ? .positiveFeedbackAccepted(accepted) : .negativeFeedbackAccepted(accepted)) { _ in }
    }

    @objc private func onClosePressed() {
        postActionWithOverlay(accepted: false)
    }
}
