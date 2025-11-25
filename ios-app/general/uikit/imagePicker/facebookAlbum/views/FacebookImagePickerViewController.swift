import UIKit

class FacebookImagePickerViewController: BaseViewController {
    var presenter: FacebookImagePickerPresenterProtocol!
    private var albums: [FacebookPhotosAlbum] = []

    @IBOutlet weak var albumsCollectionView: UICollectionView!
    override class var storyboard: UIStoryboard {
        return .imagePickers
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(handleBackButtonPress))
        navigationItem.leftBarButtonItem?.setTitleTextAttributes(
            [.foregroundColor: UIColor.white, .font: UIFont.openSans(size: 16)],
            for: .normal
        )
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        presenter?.viewDidLoad()
        title = "facebookAlbumsTitle".localized
    }
}

// MARK: - FacebookImagePickerView
extension FacebookImagePickerViewController: FacebookImagePickerView {
    func updateView(for albums: [FacebookPhotosAlbum]) {
        self.albums = albums
        albumsCollectionView.reloadData()

        UIView.animate(withDuration: ((albums.count == 0) ? 0.3 : 0)) { [weak self] in
            self?.albumsCollectionView.alpha = 1
        }
    }
}

// MARK: - UICollectionViewDataSource
extension FacebookImagePickerViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return albums.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        return collectionView.dequeueReusableCell(of: FacebookAlbumCollectionViewCell.self, for: indexPath, configure: { cell in
            let album = albums[indexPath.row]
            cell.labelAlbumTitle.text = album.name
            cell.labelPhotosCount.text = "\(album.photosCount)"
            cell.imageView.loadImage(uniqueId: "facebook.album.cover.\(album.id)", loadBlock: { (completion: @escaping (UIImage?) -> Void) in
                self.presenter?.coverImageFor(album: album, completion: completion)
            })
        })
    }
}

// MARK: - UICollectionViewDelegate
extension FacebookImagePickerViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        presenter.showAlbum?(albums[indexPath.row])

    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension FacebookImagePickerViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        return CGSize(width: collectionView.frame.width, height: 61)
    }
}
