import UIKit

extension UILongPressGestureRecognizer {
    /// Checks if the gesture should be cancelled, when the user goes out of bounds of the view the gesture is connected to.
    ///
    /// - Returns: True if the user has travel far out of bounds else it will be false.
    func shouldCancelGesture() -> Bool {
        guard let view = self.view else {
            return false
        }

        let location = self.location(in: view)

        var x = location.x
        var y = location.y

        // If the location is negative make it absolute and adjust the value by using the width or height.
        if x < 0 {
            x = abs(x) + view.frame.width
        }

        if y < 0 {
            y = abs(y) + view.frame.height
        }

        return x > (view.frame.width * 1.5) || y > (view.frame.height * 1.5)
    }

    /// Cancels the gesture when the user goes out of bounds of the view the gesture is connected to.
    func cancelIfNeeded() {
        if shouldCancelGesture() {
            // Disable to cancel, then enable the gesture again.
            isEnabled = false
            isEnabled = true
        }
    }
}
