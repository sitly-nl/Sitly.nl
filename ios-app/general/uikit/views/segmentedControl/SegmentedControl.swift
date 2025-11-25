import UIKit

enum SegmentedControlStyle {
    case semiTransparent
    case opaque
}

class SegmentedControl: UIView {
    weak var delegate: SegmentedControlDelegate?
    var style = SegmentedControlStyle.semiTransparent

    private var overlayView = UIView()
    private var overlayWidthConstraint = NSLayoutConstraint()
    private var overlayLeadingConstraint = NSLayoutConstraint()
    private(set) var selectedSegment: Int?
    private let defaultCornerRadius: CGFloat = 3

    var segments = [String]() {
        didSet {
            setUpView()
        }
    }

    private var buttons = [UIButton]()
    private var buttonWidths = [NSLayoutConstraint]()

    override func layoutSubviews() {
        super.layoutSubviews()

        let segmentSize = CGSize(width: frame.width / CGFloat(segments.count), height: frame.height)
        buttonWidths.forEach { $0.constant = segmentSize.width }

        if let index = selectedSegment, buttons.any {
            let button = buttons[index]
            setUpButton(button: button, for: .selected)

            var corners: UIRectCorner = [.topLeft]
            var radius: CGFloat = defaultCornerRadius

            // Because of the added separator we have to make the view slightly bigger and make the left margin smaller.
            overlayWidthConstraint.constant = segmentSize.width + 1
            overlayLeadingConstraint.constant = (segmentSize.width * CGFloat(index)) - 1

            if index == 0 { // The first has the regular width and default left margin, because the separator is added the right of the first button.
                corners = [.topLeft, .bottomLeft]
                overlayWidthConstraint.constant = segmentSize.width
                overlayLeadingConstraint.constant = button.frame.minX
            } else if index == buttons.count - 1 {
                corners = [.topRight, .bottomRight]
            } else {
                radius = 0 // No corners for parts in the middle.
            }
            if style == .opaque {
                overlayView.roundCorners(corners, radius: radius, borderColor: .neutral900, borderWidth: 2, width: overlayWidthConstraint.constant)
            }
        }
    }

    // MARK: - Set-up views
    private func setUpView() {
        // Make sure all views are gone.
        removeSubviews()
        buttons = [UIButton]()
        buttonWidths = [NSLayoutConstraint]()

        backgroundColor = .white
        layer.cornerRadius = defaultCornerRadius
        layer.masksToBounds = true

        // Determine size of segment
        let width = segments.count == 0 ?  frame.width : frame.width / CGFloat(segments.count)
        let segmentSize = CGSize(width: width, height: frame.height)
        var toView: UIView = self

        // Create a button for each segment and constrain them
        segments.forEach { segment in
            let button = UIButton(frame: CGRect(x: 0, y: 0, width: segmentSize.width, height: segmentSize.height))
            button.translatesAutoresizingMaskIntoConstraints = false
            button.layer.borderWidth = 1
            button.layer.borderColor = UIColor.neutral900.cgColor
            button.titleLabel?.font = UIFont.openSans(size: 14)
            button.setTitle(segment.localized, for: .normal)
            button.addTarget(self, action: #selector(selectSegment(sender:)), for: .touchUpInside)
            setUpButton(button: button, for: .normal)

            buttons.append(button)
            addSubview(button)

            setUpButtonConstraints(button: button, toView: toView, segmentSize: segmentSize)
            toView = button
        }

        setUpOverlay(segmentSize: segmentSize)
    }

    private func setUpButton(button: UIButton, for state: UIControl.State) {
        switch style {
        case .semiTransparent:
            button.setTitleColor(state == .selected ? .white : .neutral900, for: .normal)
            button.backgroundColor = state == .selected ? .neutral900 : .clear
        case .opaque:
            button.setTitleColor(state == .selected ? .white : .neutral900, for: .normal)
            button.backgroundColor = state == .selected ? .neutral900 : .white
        }
    }

    private func setUpButtonConstraints(button: UIButton, toView: UIView, segmentSize: CGSize) {
        let leading = NSLayoutConstraint(
            item: button, attribute: .leading, relatedBy: .equal,
            toItem: toView, attribute: toView == self ? .leading : .trailing,
            multiplier: 1, constant: 0
        )
        let width = NSLayoutConstraint(
            item: button, attribute: .width, relatedBy: .equal,
            toItem: nil, attribute: .notAnAttribute,
            multiplier: 1, constant: segmentSize.width
        )
        let top = NSLayoutConstraint(
            item: button, attribute: .top, relatedBy: .equal, toItem: self, attribute: .top, multiplier: 1, constant: 0
        )
        let bottom = NSLayoutConstraint(
            item: button, attribute: .bottom, relatedBy: .equal, toItem: self, attribute: .bottom, multiplier: 1, constant: 0
        )

        buttonWidths.append(width)
        addConstraints([leading, width, top, bottom])
    }

    private func setUpOverlay(segmentSize: CGSize) {
        // Create a overlay
        overlayView = UIView(frame: CGRect(x: 0, y: 0, width: segmentSize.width, height: segmentSize.height))
        overlayView.translatesAutoresizingMaskIntoConstraints = false
        overlayView.backgroundColor = .clear
        overlayView.isUserInteractionEnabled = false

        addSubview(overlayView)

        // Set-up constraints
        overlayLeadingConstraint = NSLayoutConstraint(
            item: overlayView, attribute: .leading, relatedBy: .equal, toItem: self, attribute: .leading, multiplier: 1, constant: 0
        )
        overlayWidthConstraint = NSLayoutConstraint(
            item: overlayView, attribute: .width, relatedBy: .equal,
            toItem: nil, attribute: .notAnAttribute,
            multiplier: 1, constant: segmentSize.width
        )
        let top = NSLayoutConstraint(
            item: overlayView, attribute: .top, relatedBy: .equal, toItem: self, attribute: .top, multiplier: 1, constant: 0
        )
        let bottom = NSLayoutConstraint(
            item: overlayView, attribute: .bottom, relatedBy: .equal, toItem: self, attribute: .bottom, multiplier: 1, constant: 0
        )

        addConstraints([overlayLeadingConstraint, overlayWidthConstraint, top, bottom])
    }

    // MARK: - Actions
    @objc private func selectSegment(sender: UIButton) {
        guard let index = buttons.firstIndex(of: sender) else {
            return
        }

        setSelectedSegment(index: index)
        delegate?.didSelectSegment(index: index)
    }

    func setSelectedSegment(index: Int) {
        guard index >= 0 && index < buttons.count, index != selectedSegment else {
            return
        }

        if let previouslySelectedIndex = selectedSegment {
            setUpButton(button: buttons[previouslySelectedIndex], for: .normal)
        }
        setUpButton(button: buttons[index], for: .selected)

        selectedSegment = index
    }
}
