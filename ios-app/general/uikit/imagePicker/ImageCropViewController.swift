import UIKit

class ImageCropViewController: BaseViewController {
    let maxDimension = CGFloat(1500)
    var completion: ((_ image: UIImage?) -> Void)?
    var image: UIImage? {
        didSet {
            view.layoutIfNeeded()
            imageView.image = image

            updateMinZoomScale()
            updateConstraints()
            scrollView.contentOffset = CGPoint(
                x: max(0, (scrollView.contentSize.width - scrollView.bounds.width) / 2),
                y: max(0, (scrollView.contentSize.height - scrollView.bounds.height) / 2))

        }
    }
    @IBOutlet weak private var titleLabel: UILabel!
    @IBOutlet weak private var scrollView: UIScrollView!
    @IBOutlet weak private var imageView: UIImageView!
    @IBOutlet weak private var buttonRotate: UIButton!
    @IBOutlet weak private var buttonChoose: UIButton!
    @IBOutlet weak private var frameView: UIView!
    @IBOutlet weak private var faceIndicatorLabel: UILabel!
    @IBOutlet weak private var imageViewLeadingConstraint: NSLayoutConstraint!
    @IBOutlet weak private var imageViewBottomConstraint: NSLayoutConstraint!
    @IBOutlet weak private var imageViewTopConstraint: NSLayoutConstraint!
    @IBOutlet weak private var imageViewTrailingConstraint: NSLayoutConstraint!

    override class var storyboard: UIStoryboard {
        return .imagePickers
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "cropImageTitle".localized
        faceIndicatorLabel.text = "main.face".localized
        buttonRotate.setTitle("  " + "main.rotate".localized, for: .normal)
        buttonChoose.setTitle("cropImageChoose".localized, for: .normal)
        frameView.layer.borderWidth = 1
        frameView.layer.borderColor = UIColor.white.cgColor
    }

    private func updateMinZoomScale() {
        let widthScale = view.bounds.size.width / (imageView.image?.size.width ?? 1)
        let heightScale = view.bounds.size.width / (imageView.image?.size.height ?? 1)
        let minScale = max(widthScale, heightScale)

        scrollView.minimumZoomScale = minScale
        scrollView.maximumZoomScale = max(minScale, 1)
        scrollView.zoomScale = minScale
    }

    private func updateConstraints() {
        let yOffset = max(0, (scrollView.bounds.height - imageView.frame.height) / 2)
        imageViewTopConstraint.constant = yOffset
        imageViewBottomConstraint.constant = yOffset

        let xOffset = max(0, (scrollView.bounds.width - imageView.frame.width) / 2)
        imageViewLeadingConstraint.constant = xOffset
        imageViewTrailingConstraint.constant = xOffset

        view.layoutIfNeeded()
    }

// MARK: - Actions
    @IBAction func onClosePressed() {
        dismiss(animated: true)
    }

    @IBAction func onRotatePressed() {
        image = image?.rotate(radians: -.pi/2)
    }

    @IBAction func onChoosePressed() {
        let visibleRect = CGRect(
            x: scrollView.contentOffset.x / scrollView.zoomScale,
            y: scrollView.contentOffset.y / scrollView.zoomScale,
            width: scrollView.bounds.width / scrollView.zoomScale,
            height: scrollView.bounds.height / scrollView.zoomScale)
        showActivityIndicator()
        view.isUserInteractionEnabled = false
        DispatchQueue.global().async { [weak self] in
            let resultImage = self?.resultImage(image: self!.image!, rect: visibleRect)
            DispatchQueue.main.async { [weak self] in
                self?.completion?(resultImage)
                self?.hideActivityIndicator()
                self?.view.isUserInteractionEnabled = true
                self?.dismiss(animated: true)
            }
        }
    }

    func resultImage(image: UIImage, rect: CGRect) -> UIImage? {
        var scale = CGFloat(1)
        var size = rect.size
        if rect.size.width > maxDimension {
            scale = maxDimension / rect.size.width
            size = size.applying(CGAffineTransform(scaleX: scale, y: scale))
        }

        UIGraphicsBeginImageContextWithOptions(size, false, image.scale)

        let context = UIGraphicsGetCurrentContext()
        context?.scaleBy(x: scale, y: scale)
        image.draw(at: CGPoint(x: -rect.origin.x, y: -rect.origin.y))
        let croppedImage = UIGraphicsGetImageFromCurrentImageContext()

        UIGraphicsEndImageContext()
        return croppedImage
    }
}

extension ImageCropViewController: UIScrollViewDelegate {
    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return imageView
    }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
        updateConstraints()
    }
}
