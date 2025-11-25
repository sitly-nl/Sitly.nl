import UIKit

extension UIImage {
    var base64: String {
        return self.jpegData(compressionQuality: 0.9)?.base64EncodedString() ?? ""
    }

    func fixOrientation() -> UIImage {
        if imageOrientation == .up {
            return self
        }

        var transform: CGAffineTransform = CGAffineTransform.identity

        if imageOrientation == .down || imageOrientation == .downMirrored {
            transform = transform.translatedBy(x: size.width, y: size.height)
            transform = transform.rotated(by: CGFloat(Double.pi))
        }

        if imageOrientation == .left || imageOrientation == .leftMirrored {
            transform = transform.translatedBy(x: size.width, y: 0)
            transform = transform.rotated(by: CGFloat(Double.pi / 2.0))
        }

        if imageOrientation == .right || imageOrientation == .rightMirrored {
            transform = transform.translatedBy(x: 0, y: size.height)
            transform = transform.rotated(by: CGFloat(-Double.pi / 2.0))
        }

        if imageOrientation == .upMirrored || imageOrientation == .downMirrored {
            transform = transform.translatedBy(x: size.width, y: 0)
            transform = transform.scaledBy(x: -1, y: 1)
        }

        if imageOrientation == .leftMirrored || imageOrientation == .rightMirrored {
            transform = transform.translatedBy(x: size.height, y: 0)
            transform = transform.scaledBy(x: -1, y: 1)
        }

        guard let cgImage = cgImage, let colorSpace = cgImage.colorSpace else {
            return self
        }

        let ctx = CGContext(
            data: nil,
            width: Int(size.width),
            height: Int(size.height),
            bitsPerComponent: cgImage.bitsPerComponent,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: cgImage.bitmapInfo.rawValue
        )
        ctx?.concatenate(transform)

        if imageOrientation == .left || imageOrientation == .leftMirrored || imageOrientation == .right || imageOrientation == .rightMirrored {
            ctx?.draw(cgImage, in: CGRect(x: 0, y: 0, width: size.height, height: size.width))
        } else {
            ctx?.draw(cgImage, in: CGRect(x: 0, y: 0, width: size.width, height: size.height))
        }

        guard let image = ctx?.makeImage() else {
            return self
        }

        return UIImage(cgImage: image)
    }

    func rotate(radians: Float) -> UIImage? {
        var newSize = CGRect(origin: CGPoint.zero, size: size).applying(CGAffineTransform(rotationAngle: CGFloat(radians))).size
        // Trim off the extremely small float value to prevent core graphics from rounding it up
        newSize.width = floor(newSize.width)
        newSize.height = floor(newSize.height)

        UIGraphicsBeginImageContextWithOptions(newSize, false, scale)
        let context = UIGraphicsGetCurrentContext()!

        // Move origin to middle
        context.translateBy(x: newSize.width/2, y: newSize.height/2)
        // Rotate around middle
        context.rotate(by: CGFloat(radians))
        // Draw the image at its center
        draw(in: CGRect(x: -size.width/2, y: -size.height/2, width: size.width, height: size.height))

        let newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return newImage
    }

    class func loadImage(from url: URL, completion: @escaping (UIImage?) -> Void) {
        let urlRequest = URLRequest(url: url)
        if let cachedResponse = URLCache.shared.cachedResponse(for: urlRequest),
           let image = UIImage(data: cachedResponse.data) {
            completion(image)
            return
        }

        URLSession.shared.dataTask(with: urlRequest) { data, response, _ in
            if let data = data, let response = response, let image = UIImage(data: data) {
                let cachedResponse = CachedURLResponse(response: response, data: data)
                URLCache.shared.storeCachedResponse(cachedResponse, for: urlRequest)
                completion(image)
            } else {
                completion(nil)
            }
        }.resume()
    }
}
