import UIKit

enum PhotosItems {
    case facebook([FacebookPhotosAlbumItem])
    case instagram([InstagramMediaData])

    var count: Int {
        switch self {
        case .facebook(let items):
            return items.count
        case .instagram(let items):
            return items.count
        }
    }
}

class PhotoPickerViewController: BaseViewController {
	var presenter: PhotoPickerPresenterProtocol?
    private var items = PhotosItems.facebook([])
    private static let itemsPerRow: CGFloat = 4
    private static let cellSpacing: CGFloat = 4

    @IBOutlet weak var collectionView: UICollectionView!
    override class var storyboard: UIStoryboard {
        return .imagePickers
    }

	override func viewDidLoad() {
        super.viewDidLoad()
        presenter?.viewDidLoad()

        let layout = collectionView.collectionViewLayout as? UICollectionViewFlowLayout
        layout?.minimumInteritemSpacing = PhotoPickerViewController.cellSpacing
        layout?.minimumLineSpacing = PhotoPickerViewController.cellSpacing
        layout?.sectionInset = UIEdgeInsets(
            top: PhotoPickerViewController.cellSpacing,
            left: PhotoPickerViewController.cellSpacing,
            bottom: PhotoPickerViewController.cellSpacing,
            right: PhotoPickerViewController.cellSpacing
        )
    }

    func addCancelBarItem() {
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(handleBackButtonPress))
        navigationItem.leftBarButtonItem?.setTitleTextAttributes(
            [.foregroundColor: UIColor.white, .font: UIFont.openSans(size: 16)],
            for: .normal
        )
    }
}

// MARK: - FacebookAlbumPhotosView
extension PhotoPickerViewController: PhotoPickerView {
    func updateTitle(_ title: String) {
        self.title = title
    }

    func updateView(items: PhotosItems) {
        self.items = items
        collectionView.reloadData()

        UIView.animate(withDuration: ((items.count == 0) ? UIView.defaultAnimationDuration : 0)) { [weak self] in
            self?.collectionView.alpha = 1
        }
    }
}

// MARK: - UICollectionViewDataSource
extension PhotoPickerViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return items.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        return collectionView.dequeueReusableCell(of: PhotoPickerCollectionViewCell.self, for: indexPath, configure: { cell in
            switch items {
            case .facebook(let photos):
                cell.albumIcon.isHidden = true
                let photo = photos[indexPath.row]
                cell.imageView.loadImage(uniqueId: "facebook.album.photo.\(photo.id)", loadBlock: { (completion: @escaping (UIImage?) -> Void) in
                    self.presenter?.loadPhoto(id: photo.id, asThumbnail: true, completion: completion)
                })
            case .instagram(let photos):
                let photo = photos[indexPath.row]
                cell.albumIcon.isHidden = photo.mediaType != .carouselAlbum
                cell.imageView.loadImage(withUrl: URL(string: photo.mediaUrl))
            }
        })
    }
}

// MARK: - UICollectionViewDelegate
extension PhotoPickerViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        switch items {
        case .facebook(let photos):
            presenter?.didSelectFacebook(photo: photos[indexPath.row])
        case .instagram(let photos):
            presenter?.didSelectInstagram(photo: photos[indexPath.row])
        }
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension PhotoPickerViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        let spacingWidth = (PhotoPickerViewController.itemsPerRow + 1) * PhotoPickerViewController.cellSpacing
        let dimension = (collectionView.frame.width - spacingWidth) / PhotoPickerViewController.itemsPerRow
        return CGSize(width: dimension, height: dimension)
    }
}
