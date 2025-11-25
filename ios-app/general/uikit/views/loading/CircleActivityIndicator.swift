import UIKit

class CircleActivityIndicator: UIView {
    private var circleView = UIImageView()
    let duration: Double = 1.5
    var color: UIColor = .white {
        didSet {
            circleView.tintColor = color
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    override func prepareForInterfaceBuilder() {
        super.prepareForInterfaceBuilder()
        setUpView(Bundle(for: type(of: self)), alpha: 1)
    }

    override var intrinsicContentSize: CGSize {
        return CGSize(width: 30, height: 30)
    }

    private func setUpImages(_ bundle: Bundle? = nil) {
        circleView = UIImageView(image: UIImage(named: "loading", in: bundle, compatibleWith: self.traitCollection)?.withRenderingMode(.alwaysTemplate))
        circleView.tintColor = color
    }

    private func setUpView(_ bundle: Bundle? = nil, alpha: CGFloat = 0) {
        self.alpha = alpha
        isHidden = alpha == 0
        backgroundColor = .clear
        setUpImages(bundle)

        // Disable auto resizing masks
        circleView.translatesAutoresizingMaskIntoConstraints = false

        // Add to the UIView
        addSubview(circleView)

        // Set-up contraints
        NSLayoutConstraint.centerView(circleView, toItem: self)
    }

    /// Starts the rotation animations and fades in the view.
    func startAnimating() {
        isHidden = false
        startRotating(duration: duration)

        UIView.animate(withDuration: 0.3, animations: { [unowned self] in
            self.alpha = 1
        })
    }

    /// Stops the rotation animation and fades out the view.
    func stopAnimating() {
        isHidden = false
        stopRotating()

        UIView.animate(withDuration: 0.3, animations: { [unowned self] in
            self.alpha = 0
        })
    }

// MARK: - Helper
    func startRotating(duration: Double = 1) {
        // Don't add the animation twice
        if circleView.layer.animation(forKey: "rotation") != nil {
            return
        }

        let animation = CABasicAnimation(keyPath: "transform.rotation")
        animation.isRemovedOnCompletion = false
        animation.duration = duration
        animation.repeatCount = Float.infinity
        animation.fromValue = 0.0
        animation.toValue = Float(.pi * 2.0)
        circleView.layer.add(animation, forKey: "rotation")
    }

    func stopRotating() {
        if circleView.layer.animation(forKey: "rotation") == nil {
            return
        }
        circleView.layer.removeAnimation(forKey: "rotation")
    }
}
