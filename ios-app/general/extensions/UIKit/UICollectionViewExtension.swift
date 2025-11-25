import UIKit

extension UICollectionViewCell {
    @nonobjc static var identifier: String {
        return String(describing: self)
    }
}

extension UICollectionView {
    func dequeueReusableCell<T: UICollectionViewCell>(ofType type: T.Type, for indexPath: IndexPath) -> T {
        return dequeueReusableCell(withReuseIdentifier: String(describing: T.self), for: indexPath) as? T ?? T()
    }

    func register(_ cell: UICollectionViewCell.Type) {
        register(cell, forCellWithReuseIdentifier: cell.identifier)
    }

    func registerNib<T: UICollectionViewCell>(ofType type: T.Type) {
        let identifier = String(describing: T.self)
        register(UINib(nibName: identifier, bundle: nil), forCellWithReuseIdentifier: identifier)
    }

    func registerNib(identifier: String) {
        register(UINib(nibName: identifier, bundle: nil), forCellWithReuseIdentifier: identifier)
    }

    func registerHeader<T: UICollectionReusableView>(ofType type: T.Type) {
        let identifier = String(describing: T.self)
        register(
            UINib(nibName: identifier, bundle: nil),
            forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader,
            withReuseIdentifier: identifier)
    }

    func dequeueReusableHeader<T: UICollectionReusableView>(ofType type: T.Type, for indexPath: IndexPath) -> T {
        return dequeueReusableSupplementaryView(
            ofKind: UICollectionView.elementKindSectionHeader,
            withReuseIdentifier: String(describing: T.self),
            for: indexPath
        ) as? T ?? T()
    }

    func dequeueReusableCell<CellClass: UICollectionViewCell>(
        of class: CellClass.Type, for indexPath: IndexPath, configure: ((CellClass) -> Void) = { _ in }
    ) -> UICollectionViewCell {
        let cell = dequeueReusableCell(withReuseIdentifier: CellClass.identifier,
                                       for: indexPath)

        if let typedCell = cell as? CellClass {
            configure(typedCell)
        }

        return cell
    }
}
