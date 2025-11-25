import UIKit

extension UITableViewCell {
    @nonobjc static var identifier: String {
		return String(describing: self)
	}
}

extension UITableView {
    func register(_ cell: UITableViewCell.Type) {
        register(cell, forCellReuseIdentifier: cell.identifier)
    }

    func dequeueReusableCell<CellClass: UITableViewCell>(
        of class: CellClass.Type, for indexPath: IndexPath, configure: ((CellClass) -> Void) = { _ in }
    ) -> UITableViewCell {
        let cell = dequeueReusableCell(withIdentifier: CellClass.identifier, for: indexPath)
        if let typedCell = cell as? CellClass {
            configure(typedCell)
        }
        return cell
    }
}
