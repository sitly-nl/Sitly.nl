import UIKit

class LoadingIndicatorView: UIView {
    var shown = false {
        didSet {
            if shown == oldValue {
                return
            }

            if shown {
                isHidden = false
                activityIndicator.startAnimating()
            } else {
                activityIndicator.stopAnimating()
            }
            UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
                self.alpha = self.shown ? 1 : 0
            }, completion: { _ in
                if !self.shown {
                    self.isHidden = true
                }
            })
        }
    }

    lazy var activityIndicator: CircleActivityIndicator = {
        self.addSubview($0)
        NSLayoutConstraint.activate([
            $0.centerXAnchor.constraint(equalTo: centerXAnchor),
            $0.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
        return $0
    }(CircleActivityIndicator.autolayoutInstance())
    let titleLabel = UILabel.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override init(frame: CGRect) {
        super.init(frame: frame)
        alpha = 0
        backgroundColor = UIColor.black.withAlphaComponent(0.4)

        addSubview(titleLabel)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 12)
        ])
    }
}
