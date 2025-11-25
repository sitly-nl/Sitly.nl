import UIKit

extension UIView {
    static var defaultAnimationDuration = 0.33

    class func autolayoutInstance() -> Self {
        let item = self.init()
        item.translatesAutoresizingMaskIntoConstraints = false
        return item
    }

    func removeSubviews() {
        subviews.forEach {
            $0.removeFromSuperview()
        }
    }

    func roundCorners(_ corners: UIRectCorner, radius: CGFloat, borderColor: UIColor? = nil, borderWidth: CGFloat? = 0, width: CGFloat? = nil) {
        let viewFrame = CGRect(x: 0, y: 0, width: width ?? bounds.width, height: bounds.height)

        let path = UIBezierPath(roundedRect: viewFrame, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        let mask = CAShapeLayer()
        mask.path = path.cgPath
        layer.mask = mask
        let border = "border"

        if let borderLayer = layer.sublayers?.first(where: { $0.name?.equalsIgnoreCase(border) ?? false }) {
            borderLayer.removeFromSuperlayer()
        }

        if let bColor = borderColor, let bWidth = borderWidth {
            let borderLayer = CAShapeLayer()
            borderLayer.path = mask.path
            borderLayer.fillColor = UIColor.clear.cgColor
            borderLayer.strokeColor = bColor.cgColor
            borderLayer.lineWidth = bWidth
            borderLayer.frame = viewFrame
            borderLayer.name = border
            layer.addSublayer(borderLayer)
        }
    }

    /// Makes the view circular, when height and width are equal.
    func circular() {
        if frame.width != frame.height {
            return
        }

        layer.cornerRadius = frame.width / 2
        layer.masksToBounds = true
    }

    func addDashedBorder(
        _ color: UIColor = UIColor.black, withWidth width: CGFloat = 2, cornerRadius: CGFloat = 5, dashPattern: [NSNumber] = [4, 2]
    ) {
        let shapeLayer = CAShapeLayer()

        shapeLayer.bounds = bounds
        shapeLayer.position = CGPoint(x: bounds.width/2, y: bounds.height/2)
        shapeLayer.fillColor = nil
        shapeLayer.strokeColor = color.cgColor
        shapeLayer.lineWidth = width
        shapeLayer.lineJoin = CAShapeLayerLineJoin.round // Updated in swift 4.2
        shapeLayer.lineDashPattern = dashPattern
        shapeLayer.path = UIBezierPath(roundedRect: bounds, cornerRadius: cornerRadius).cgPath

        self.layer.addSublayer(shapeLayer)
    }
}

extension UIView {
    @IBInspectable var cornerRadius: CGFloat {
        get { return layer.cornerRadius }
        set {
            layer.cornerRadius = newValue
            layer.masksToBounds = cornerRadius > 0
        }
    }

    @IBInspectable var borderWidth: CGFloat {
        get { return layer.borderWidth }
        set { layer.borderWidth = newValue }
    }
    @IBInspectable var borderColor: UIColor? {
        get { return layer.borderColor.flatMap { UIColor(cgColor: $0) } }
        set { layer.borderColor = newValue?.cgColor }
    }
}
