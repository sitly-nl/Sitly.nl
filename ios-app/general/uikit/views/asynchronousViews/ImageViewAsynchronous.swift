import UIKit

class ImageViewAsynchronous: UIImageView, AsynchronousView {
	lazy var helper: AsynchronousViewHelper = AsynchronousViewHelper(parentView: self)
    override var image: UIImage? {
        didSet {
            helper.lastLoadedImageUniqueId = nil
        }
    }

	func updateImage(_ image: UIImage?) {
		self.image = image
	}
}
