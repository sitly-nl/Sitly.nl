import UIKit

class RangeSlider: UIView {
    weak var delegate: RangeSliderDelegate?
    private(set) var minimumTitleLabel = UILabel()
    private(set) var maximumTitleLabel = UILabel()
    var maxValueTitle: String?

    private static let thumbDimension = CGFloat(24)
    private var track = UIView()
    private var trackFill = UIView()
    private var minimumThumbContainer = UIView()
    private var maximumThumbContainer = UIView()
    private var minimumThumb = CircularView(frame: CGRect(x: 0, y: 0, width: thumbDimension, height: thumbDimension))
    private var maximumThumb = CircularView(frame: CGRect(x: 0, y: 0, width: thumbDimension, height: thumbDimension))
    private var minimumConstraint = NSLayoutConstraint()
    private var maximumConstraint = NSLayoutConstraint()
    private var minimumAllowedValue = 0
    private var maximumAllowedValue = 0
    private var initialMinValue = 0
    private var initialMaxValue = 0
    private var isPanning = false
    private var pixelsPerStep: CGFloat {
        return frame.width / CGFloat(maximumAllowedValue - minimumAllowedValue)
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUpView()
    }

// MARK: - Views set-up
    private func setUpView() {
        setUpTrack()
        setUpThumbs()
        setUpTrackFill()
    }

    private func setUpTrack() {
        track.layer.borderColor = UIColor.neutral900.cgColor
        track.layer.borderWidth = 1
        track.layer.cornerRadius = 4
        track.translatesAutoresizingMaskIntoConstraints = false

        addSubview(track)

        addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "H:|-0-[track]-0-|", options: [], metrics: nil, views: ["track": track]))
        addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "V:|-6-[track(10)]", options: [], metrics: nil, views: ["track": track]))
    }

    private func setUpThumbs() {
        setUpThumb(thumb: minimumThumb, thumbContainer: minimumThumbContainer, titleLabel: minimumTitleLabel)
        setUpThumb(thumb: maximumThumb, thumbContainer: maximumThumbContainer, titleLabel: maximumTitleLabel)

        minimumConstraint = NSLayoutConstraint(
            item: minimumThumbContainer, attribute: .leading, relatedBy: .equal, toItem: self, attribute: .leading, multiplier: 1, constant: 0
        )
        addConstraint(minimumConstraint)
        maximumConstraint = NSLayoutConstraint(
            item: maximumThumbContainer, attribute: .trailing, relatedBy: .equal, toItem: self, attribute: .trailing, multiplier: 1, constant: 0
        )
        addConstraint(maximumConstraint)
    }

    private func setUpThumb(thumb: CircularView, thumbContainer: UIView, titleLabel: UILabel) {
        thumbContainer.translatesAutoresizingMaskIntoConstraints = false
        thumb.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        addSubview(thumbContainer)

        addConstraint(NSLayoutConstraint(
            item: thumbContainer, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .notAnAttribute, multiplier: 1, constant: 40)
        )
        addConstraint(NSLayoutConstraint(
            item: thumbContainer, attribute: .width, relatedBy: .equal, toItem: nil, attribute: .notAnAttribute, multiplier: 1, constant: 24)
        )
        addConstraint(NSLayoutConstraint(
            item: thumbContainer, attribute: .top, relatedBy: .equal, toItem: self, attribute: .top, multiplier: 1, constant: 0)
        )

        thumb.layer.borderColor = UIColor.neutral900.cgColor
        thumb.layer.borderWidth = 1
        thumb.backgroundColor = .white
        thumb.titleLabel?.textColor = .defaultText

        thumbContainer.addSubview(thumb)

        thumbContainer.addConstraint(NSLayoutConstraint(
            item: thumb, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .notAnAttribute, multiplier: 1, constant: 24
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: thumb, attribute: .width, relatedBy: .equal, toItem: nil, attribute: .notAnAttribute, multiplier: 1, constant: 24
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: thumb, attribute: .top, relatedBy: .equal, toItem: thumbContainer, attribute: .top, multiplier: 1, constant: 0
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: thumb, attribute: .centerX, relatedBy: .equal, toItem: thumbContainer, attribute: .centerX, multiplier: 1, constant: 0
        ))

        titleLabel.font = UIFont.openSansItalic(size: 11)
        titleLabel.textColor = .defaultText
        titleLabel.textAlignment = .center

        thumbContainer.addSubview(titleLabel)

        thumbContainer.addConstraint(NSLayoutConstraint(
            item: titleLabel, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .notAnAttribute, multiplier: 1, constant: 15
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: titleLabel, attribute: .leading, relatedBy: .equal, toItem: thumbContainer, attribute: .leading, multiplier: 1, constant: 0
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: thumbContainer, attribute: .trailing, relatedBy: .equal, toItem: titleLabel, attribute: .trailing, multiplier: 1, constant: 0
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: titleLabel, attribute: .top, relatedBy: .equal, toItem: thumb, attribute: .bottom, multiplier: 1, constant: 0
        ))
        thumbContainer.addConstraint(NSLayoutConstraint(
            item: titleLabel, attribute: .centerX, relatedBy: .equal, toItem: thumb, attribute: .centerX, multiplier: 1, constant: 0
        ))

        thumbContainer.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(didPan(sender:))))
    }

    private func setUpTrackFill() {
        trackFill.translatesAutoresizingMaskIntoConstraints = false
        trackFill.backgroundColor = .neutral900

        track.addSubview(trackFill)

        track.addConstraint(NSLayoutConstraint(
            item: trackFill,
            attribute: .top,
            relatedBy: .equal,
            toItem: track,
            attribute: .top,
            multiplier: 1,
            constant: 0
        ))
        track.addConstraint(NSLayoutConstraint(
            item: trackFill,
            attribute: .bottom,
            relatedBy: .equal,
            toItem: track,
            attribute: .bottom,
            multiplier: 1,
            constant: 0
        ))

        let centerOnMinThumb = NSLayoutConstraint(
            item: trackFill, attribute: .leading, relatedBy: .equal,
            toItem: minimumThumbContainer, attribute: .centerXWithinMargins,
            multiplier: 1, constant: 0
        )
        centerOnMinThumb.priority = UILayoutPriority.defaultHigh

        addConstraint(centerOnMinThumb)

        let centerOnMaxThumb = NSLayoutConstraint(
            item: trackFill, attribute: .trailing, relatedBy: .equal,
            toItem: maximumThumbContainer, attribute: .centerXWithinMargins,
            multiplier: 1, constant: 0
        )
        centerOnMaxThumb.priority = UILayoutPriority.defaultHigh

        addConstraint(centerOnMaxThumb)
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        if !isPanning {
            // Set thumbs to current location
            minimumConstraint.constant = pixelsPerStep * CGFloat(initialMinValue - minimumAllowedValue)
            maximumConstraint.constant = -(pixelsPerStep * CGFloat(maximumAllowedValue - initialMaxValue))
        }
    }

// MARK: - Value
    func value(thumbView: UIView) -> Int {
        let pixelsPerStep = (frame.width - RangeSlider.thumbDimension) / CGFloat(maximumAllowedValue - minimumAllowedValue)
        return minimumAllowedValue + Int((thumbView.center.x - 0.5*RangeSlider.thumbDimension) / pixelsPerStep)
    }

// MARK: - Configure
    func configure(min: Int, max: Int, currentMin: Int? = nil, currentMax: Int? = nil) {
        minimumAllowedValue = min
        maximumAllowedValue = max
        initialMinValue = currentMin ?? min
        initialMaxValue = currentMax ?? max
        updateMinLabelText(value: initialMinValue)
        updateMaxLabelText(value: initialMaxValue)

        setNeedsLayout()
        layoutIfNeeded()
    }

// MARK: - Actions
    @objc private func didPan(sender: UIPanGestureRecognizer) {
        // Determine which view was panned
        isPanning = true
        sender.view.flatMap { bringSubviewToFront($0) }
        let minimumViewIsPanned = sender.view?.isEqual(minimumThumbContainer) ?? false
        let constraint = minimumViewIsPanned ? minimumConstraint : maximumConstraint
        let translation = sender.translation(in: self)

        var location = constraint.constant + translation.x

        // Set bounds of sliding animation
        if minimumViewIsPanned && location < 0 {
            location = 0
        } else if !minimumViewIsPanned && location > 0 {
            location = 0
        }

        let currentMinValue = self.value(thumbView: minimumThumbContainer)
        let currentMaxValue = self.value(thumbView: maximumThumbContainer)

        // Calculate expected value so we cancel the gesture if needed
        let view = minimumViewIsPanned ? minimumThumbContainer : maximumThumbContainer
        let nrOfSteps = (view.frame.minX + translation.x) / pixelsPerStep

        let expectedValue = minimumAllowedValue + Int(nrOfSteps)

        if minimumViewIsPanned && translation.x > 0 && (expectedValue >= currentMaxValue || currentMinValue + 1 >= currentMaxValue) {
            sender.cancel()
            return
        } else if !minimumViewIsPanned && translation.x < 0 && (expectedValue <= currentMinValue || currentMaxValue - 1 <= currentMinValue) {
            sender.cancel()
            return
        }

        constraint.constant = location
        layoutIfNeeded()

        // Update value
        let value = self.value(thumbView: minimumViewIsPanned ? minimumThumbContainer : maximumThumbContainer)

        if minimumViewIsPanned && currentMinValue != value {
            delegate?.didSlideMin(value: value)
        } else if !minimumViewIsPanned && currentMaxValue != value {
            delegate?.didSlideMax(value: value)
        }

        if minimumViewIsPanned {
            updateMinLabelText(value: value)
        } else {
            updateMaxLabelText(value: value)
        }

        // Reset translation
        sender.setTranslation(.zero, in: self)

        if sender.state == .ended || sender.state == .cancelled || sender.state == .failed {
            isPanning = false
        }
    }

// MARK: - Internal
    func updateMinLabelText(value: Int) {
        minimumThumb.titleLabel?.text = "\(value)"
    }

    func updateMaxLabelText(value: Int) {
        if value == maximumAllowedValue, let maxValueTitle = maxValueTitle {
            maximumThumb.titleLabel?.text = maxValueTitle
        } else {
            maximumThumb.titleLabel?.text = "\(value)"
        }
    }
}
