import UIKit

typealias ImageLoadingClosure = (_ image: UIImage?) -> Void

let cache = NSCache<NSString, UIImage>()

protocol AsynchronousView: AnyObject {
	var helper: AsynchronousViewHelper { get }
	var placeholderImage: UIImage? { get set }
	func updateImage(_ image: UIImage?)
	func loadImage(uniqueId: String?, loadBlock: @escaping (_ onCompletion: @escaping ImageLoadingClosure) -> Void)
	func loadImage(withUrl imageURL: URL?)
}

class AsynchronousViewHelper {
    var placeholderImage: UIImage?
	weak var view: UIView?

	lazy var activity: UIActivityIndicatorView = { [weak self] in
        $0.translatesAutoresizingMaskIntoConstraints = false
        if let view = self?.view {
            view.addSubview($0)
            $0.centerXAnchor.constraint(equalTo: view.centerXAnchor).isActive = true
            $0.centerYAnchor.constraint(equalTo: view.centerYAnchor).isActive = true
        }
		return $0
    }(UIActivityIndicatorView(style: .medium))
    private var showActivityIndicatorCounter = 0
    var setActivityIndicatorShown = false {
        didSet {
            if setActivityIndicatorShown {
                activity.startAnimating()
                showActivityIndicatorCounter += 1
            } else {
                showActivityIndicatorCounter -= 1
                if showActivityIndicatorCounter == 0 {
                    activity.stopAnimating()
                }
            }
        }
    }

	var lastRequestedImageUniqueId: String?
	var lastLoadedImageUniqueId: String?

	init(parentView: UIView) {
		view = parentView
	}
}

extension AsynchronousView {
    var placeholderImage: UIImage? {
        get {
            return helper.placeholderImage
        }
        set {
            helper.placeholderImage = newValue
            helper.activity.stopAnimating()
        }
    }

	func loadImage(withUrl imageURL: URL?) {
		guard let imageURL = imageURL else {
			updateImage(placeholderImage)
			helper.lastLoadedImageUniqueId = nil
			return
		}

		loadImage(uniqueId: uniqueIdFor(url: imageURL), loadBlock: { (completion: @escaping ImageLoadingClosure) in
            DispatchQueue.global().async {
                let image = (try? Data(contentsOf: imageURL)).flatMap { UIImage(data: $0) }
                DispatchQueue.main.async {
                    completion(image)
                }
            }

//            URLSession.shared.downloadTask(with: imageURL, completionHandler: { (url, _, _) in
//                if let data = url.flatMap({ try? Data(contentsOf: $0) }) {
//                    DispatchQueue.main.async {
//                        completion(UIImage(data: data))
//                    }
//                }
//            }).resume()
		})
	}

	func loadImage(uniqueId: String? = nil, loadBlock: @escaping (_ onCompletion: @escaping ImageLoadingClosure) -> Void) {
		helper.activity.stopAnimating()
		helper.lastRequestedImageUniqueId = uniqueId

		// check already loaded
		if uniqueId != nil && uniqueId == helper.lastLoadedImageUniqueId {
			return
		}

		// in memory cache
		if let image = cache.object(forKey: (uniqueId ?? "") as NSString) {
			updateImage(image)
			helper.lastLoadedImageUniqueId = uniqueId
			return
		}

		updateImage(nil)
		helper.lastLoadedImageUniqueId = nil

		// disc cache
        if  let imageCachePath = uniqueId.flatMap({ onDiskCacheURL(uniqueId: $0).path }),
			FileManager.default.fileExists(atPath: imageCachePath) {
				DispatchQueue.global().async {
					let image = UIImage(contentsOfFile: imageCachePath)
					if image == nil {
						// remove if it contains invalid data
						try? FileManager.default.removeItem(atPath: imageCachePath)
					}
					DispatchQueue.main.async {
						self.updateImage(image ?? self.placeholderImage)
                        self.helper.lastLoadedImageUniqueId = uniqueId
					}
				}
				return
		}

		helper.setActivityIndicatorShown = true
		loadBlock { (image: UIImage?) in
            self.helper.setActivityIndicatorShown = false
			if uniqueId == self.helper.lastRequestedImageUniqueId {
                self.helper.activity.stopAnimating()
				self.updateImage(image ?? self.placeholderImage)
                self.helper.lastLoadedImageUniqueId = uniqueId
			}

			if let uniqueId = uniqueId, let image = image {
                cache.setObject(image, forKey: uniqueId as NSString)
				DispatchQueue.global().async {
					try? image.pngData()?.write(to: self.onDiskCacheURL(uniqueId: uniqueId))
				}
			}
		}
	}

    private func uniqueIdFor(url: URL?) -> String? {
        return url?.path.replacingOccurrences(of: "/", with: "_")
    }

    private func onDiskCacheURL(uniqueId: String) -> URL {
        return URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(uniqueId)
    }
}
