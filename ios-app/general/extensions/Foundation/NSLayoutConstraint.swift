import UIKit

extension NSLayoutConstraint {
    /// Centers the view.
    ///
    /// - Parameters:
    ///   - item: The view that will be centered.
    ///   - toItem: The parent view where the view will be centered on.
    ///   - width: Custom width for the view, else it will use the view's frame.
    ///   - height: Custom height for the view, else it will use the view's frame.
    ///   - yOffset: Optional offset from the center on the y-axis.
    @nonobjc class func centerView(_ item: UIView, toItem: UIView, width: CGFloat? = nil, height: CGFloat? = nil, yOffset: CGFloat = 0) {
        let widthConstraint = NSLayoutConstraint(
            item: item, attribute: .width, relatedBy: .equal,
            toItem: nil, attribute: .notAnAttribute, multiplier: 1.0, constant: width ?? item.frame.width
        )
        let heightConstraint = NSLayoutConstraint(
            item: item, attribute: .height, relatedBy: .equal,
            toItem: nil, attribute: .notAnAttribute, multiplier: 1.0, constant: height ?? item.frame.height
        )
        let xConstraint = NSLayoutConstraint(
            item: item, attribute: .centerX, relatedBy: .equal,
            toItem: toItem, attribute: .centerX, multiplier: 1, constant: 0
        )
        let yConstraint = NSLayoutConstraint(
            item: item, attribute: .centerY, relatedBy: .equal,
            toItem: toItem, attribute: .centerY, multiplier: 1, constant: yOffset
        )

        NSLayoutConstraint.activate([widthConstraint, heightConstraint, xConstraint, yConstraint])
    }

    @nonobjc class func addToAllCorners(_ item: UIView, toItem: UIView, horizontalMargin: CGFloat = 0, verticalMargin: CGFloat = 0) {
        let horizontal = NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-(margin)-[view]-(margin)-|",
            options: [],
            metrics: ["margin": horizontalMargin],
            views: ["view": item]
        )
        let vertical = NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-(margin)-[view]-(margin)-|",
            options: [],
            metrics: ["margin": verticalMargin],
            views: ["view": item]
        )

        toItem.addConstraints(horizontal)
        toItem.addConstraints(vertical)
    }

    class func attachToSuperview(view: UIView, horizontalInset: CGFloat = 0, verticalInset: CGFloat = 0) {
        NSLayoutConstraint.attachToSuperviewHorizontally(view: view, inset: horizontalInset)
        NSLayoutConstraint.attachToSuperviewVertically(view: view, inset: verticalInset)
    }

    class func attachToSuperviewHorizontally(view: UIView, inset: CGFloat = 0) {
        view.superview?.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "H:|-inset-[view]-inset-|",
                                                                      options: [],
                                                                      metrics: ["inset": inset],
                                                                      views: ["view": view]))
    }

    class func attachToSuperviewVertically(view: UIView, inset: CGFloat = 0) {
        view.superview?.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "V:|-inset-[view]-inset-|",
                                                                      options: [],
                                                                      metrics: ["inset": inset],
                                                                      views: ["view": view]))
    }
}
