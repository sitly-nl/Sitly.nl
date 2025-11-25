import UIKit

class CircularView: UIView {
    enum Style {
        case text, dot
    }

    var titleLabel: UILabel?
    private var dot = UIView(frame: CGRect(x: 0, y: 0, width: 5, height: 5))
    var fontSize: CGFloat = 12 {
        didSet {
            titleLabel?.font = UIFont.openSansSemiBold(size: fontSize)
        }
    }

    var style: Style = .text {
        didSet {
            if style == .text {
                titleLabel?.isHidden = false
                dot.isHidden = true
            } else {
                titleLabel?.isHidden = true
                dot.isHidden = false
            }
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
        setUpView()
    }

    func setUpView() {
        cornerRadius = frame.height / 2

        titleLabel = UILabel(frame: CGRect(x: 0, y: 0, width: frame.width, height: frame.height))
        titleLabel?.textColor = .white
        titleLabel?.textAlignment = .center
        titleLabel?.adjustsFontSizeToFitWidth = true
        titleLabel?.minimumScaleFactor = 0.5
        titleLabel?.text = ""
        fontSize = 12

        if let label = titleLabel {
            setUp(view: label)
        }

        setUp(view: dot)
        dot.backgroundColor = .white
        dot.layer.cornerRadius = dot.frame.width / 2
        dot.layer.masksToBounds = true
        dot.isHidden = true
    }

    private func setUp(view: UIView) {
        // Disable auto resizing masks
        view.translatesAutoresizingMaskIntoConstraints = false

        // Add to the UIView
        addSubview(view)

        // Set-up contraints
        NSLayoutConstraint.centerView(view, toItem: self, yOffset: 0)
    }
}
