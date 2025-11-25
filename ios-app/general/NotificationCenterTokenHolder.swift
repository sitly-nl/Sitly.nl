import Foundation

class NotificationCenterTokenHolder {
	let token: NSObjectProtocol
	let center: NotificationCenter

	init(_ token: NSObjectProtocol, center: NotificationCenter = NotificationCenter.default) {
		self.token = token
		self.center = center
	}

	deinit {
		center.removeObserver(token)
	}
}
