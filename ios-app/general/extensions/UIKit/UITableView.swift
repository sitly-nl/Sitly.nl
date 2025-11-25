import UIKit

extension UITableView {
    func dequeueReusableCell<T: UITableViewCell>(ofType type: T.Type, for indexPath: IndexPath) -> T {
        return dequeueReusableCell(withIdentifier: String(describing: T.self), for: indexPath) as? T ?? T()
    }

    func registerNib<T: UITableViewCell>(ofType type: T.Type) {
        let identifier = String(describing: T.self)
        register(UINib(nibName: identifier, bundle: nil), forCellReuseIdentifier: identifier)
    }

    func registerNib(identifier: String) {
        register(UINib(nibName: identifier, bundle: nil), forCellReuseIdentifier: identifier)
    }

    func registerNib<T: UITableViewHeaderFooterView>(ofType type: T.Type) {
        let identifier = String(describing: T.self)
        register(UINib(nibName: identifier, bundle: nil), forHeaderFooterViewReuseIdentifier: identifier)
    }

    func reload(cell: UITableViewCell, with animation: UITableView.RowAnimation) {
        indexPath(for: cell).flatMap {
            reloadRows(at: [$0], with: animation)
        }
    }

    func performUpdate(_ update: () -> Void, completion: @escaping () -> Void) {
        CATransaction.begin()
        beginUpdates()

        CATransaction.setCompletionBlock(completion)
        update()

        endUpdates()
        CATransaction.commit()
    }
}
