import UIKit

class RecommendationOverlayController: OverlayController {
    var askForRecommendation: (() -> Void)?

    override func showInitialView() {
        let view = OverlayView(
            title: "recommendationOverlay.main.title".localized,
            firstAction: OverlayView.Action(title: "Not yet".localized, action: { [weak self] in
                self?.close()
            }),
            secondAction: OverlayView.Action(title: "Yes!".localized, action: { [weak self] in
                self?.showAskForRecommendation()
            })
        )
        loadViewToContainer(view)
    }

    func showAskForRecommendation() {
        let view = OverlayView(
            title: "recommendationOverlay.ask.title".localized,
            firstAction: OverlayView.Action(title: "No thanks".localized, action: { [weak self] in
                self?.close()
            }),
            secondAction: OverlayView.Action(title: "Ok, let's go!".localized, action: { [weak self] in
                self?.askForRecommendation?()
                self?.close()
            })
        )
        loadViewToContainer(view)
    }
}
