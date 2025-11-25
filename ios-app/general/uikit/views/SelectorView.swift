import UIKit

protocol SelectorViewDelegate: AnyObject {
    func doneWithSelected(index: Int, sender: SelectorView)
    func didSelect(index: Int, sender: SelectorView)
}

extension SelectorViewDelegate {
    func doneWithSelected(index: Int, sender: SelectorView) {}
    func didSelect(index: Int, sender: SelectorView) {}
}

protocol SelectorViewDateDelegate: AnyObject {
    func didSelect(date: Date)
}

class SelectorView: UIView, UIPickerViewDelegate, UIPickerViewDataSource {
    enum ViewType {
        case general
        case date
    }
    enum ViewAppearance {
        case bordered
        case borderless
    }

    var type = ViewType.general {
        didSet {
            switch type {
            case .general:
                break
            case .date:
                textField.inputView = datePicker
            }
        }
    }
    var viewAppearance = ViewAppearance.bordered
    var replaceTitleWithValue = false
    weak var delegate: SelectorViewDelegate?
    weak var dateDelegate: SelectorViewDateDelegate? {
        didSet {
            textField.inputView = datePicker
        }
    }
    var color: UIColor? {
        didSet {
            borderColor = color
            titleLabel.textColor = color
            dropdownTriangleImage.tintColor = color
        }
    }
    var values = [String]()
    var value: String? {
        didSet {
            setUpView(for: .selected)
        }
    }

    private(set) var titleLabel = UILabel.autolayoutInstance()
    private(set) var datePicker = UIDatePicker()
    private(set) var dateFormat = "dd-MM-yyyy"

    private var dropdownTriangleImage = UIImageView.autolayoutInstance()
    private var valueLabel = UILabel.autolayoutInstance()
    private var picker = UIPickerView()
    private var textField = UITextField.autolayoutInstance()
    private var titleLeadingConstraint: NSLayoutConstraint!

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    // MARK: - Set-up views
    private func setUpView() {
        layer.cornerRadius = 3
        layer.masksToBounds = true
        layer.borderWidth = 1

        titleLabel.font = UIFont.openSans(size: 14)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.5

        valueLabel.font = UIFont.openSansBold(size: 14)
        valueLabel.textColor = .defaultText
        valueLabel.textAlignment = .center
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        dropdownTriangleImage.image = #imageLiteral(resourceName: "dropdown_triangle").withRenderingMode(.alwaysTemplate)
        dropdownTriangleImage.contentMode = .center

        picker.delegate = self
        picker.dataSource = self
        textField.inputView = picker
        textField.isHidden = true

        let toolbar = UIToolbar(frame: CGRect(x: 0, y: 0, width: textField.frame.width, height: 44))
        toolbar.barStyle = .default
        toolbar.items = [
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(done))
        ]
        toolbar.tintColor = .defaultText
        toolbar.isTranslucent = true
        textField.inputAccessoryView = toolbar

        datePicker.datePickerMode = .date
        datePicker.preferredDatePickerStyle = .wheels
        datePicker.addTarget(self, action: #selector(changedDate(_:)), for: .valueChanged)

        addSubview(titleLabel)
        addSubview(valueLabel)
        addSubview(dropdownTriangleImage)
        addSubview(textField)

        // Constraint the views
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "[titleLabel]-8-[dropdown]-10-|",
            options: [],
            metrics: nil,
            views: ["titleLabel": titleLabel, "dropdown": dropdownTriangleImage]))
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-0-[titleLabel]-0-|",
            options: [],
            metrics: nil,
            views: ["titleLabel": titleLabel]))
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-0-[dropdown]-0-|",
            options: [],
            metrics: nil,
            views: ["dropdown": dropdownTriangleImage]))
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-0-[valueLabel]-0-|",
            options: [],
            metrics: nil,
            views: ["valueLabel": valueLabel]))
        titleLeadingConstraint = titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10)
        titleLeadingConstraint.isActive = true
        trailingAnchor.constraint(equalTo: valueLabel.trailingAnchor, constant: 10).isActive = true
        valueLabel.leadingAnchor.constraint(equalTo: titleLabel.trailingAnchor, constant: 8).isActive = true
        NSLayoutConstraint.addToAllCorners(textField, toItem: self)

        setUpView(for: .normal)

        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(showPicker(sender:))))
    }

    private func setUpView(for state: UIControl.State) {
        if state == .selected && value != nil {
            if color == nil {
                titleLabel.textColor = .defaultText
                layer.borderColor = (viewAppearance == .bordered ? UIColor.neutral900 : UIColor.clear).cgColor
                backgroundColor = .clear
                titleLeadingConstraint.constant = viewAppearance == .bordered ? 10 : 0
            }

            if replaceTitleWithValue {
                titleLabel.textColor = .defaultText
                titleLabel.text = value
            }

            valueLabel.isHidden = replaceTitleWithValue
            dropdownTriangleImage.isHidden = !replaceTitleWithValue
            dropdownTriangleImage.tintColor = .defaultText
            valueLabel.text = replaceTitleWithValue ? "" : value
        } else {
            backgroundColor = .white
            if color == nil {
                titleLabel.textColor = .placeholder
                layer.borderColor = UIColor.neutral900.cgColor
            }

            valueLabel.isHidden = true
            valueLabel.text = ""
            dropdownTriangleImage.isHidden = false
            dropdownTriangleImage.tintColor = .neutral900
        }
    }

    func configure(value: String? = nil, values: [String]) {
        self.values = values
        self.value = value
    }

    func configure(date: Date, dateFormat: String, maximumDate: Date? = Date(), showInitialValue: Bool = false) {
        datePicker.maximumDate = maximumDate
        datePicker.setDate(date, animated: false)
        self.dateFormat = dateFormat

        if showInitialValue {
            changedDate(datePicker)
        }
    }

    // MARK: - Actions
    @objc func showPicker(sender: UITapGestureRecognizer? = nil) {
        if !textField.isFirstResponder {
            picker.selectRow(values.firstIndex(of: value ?? "") ?? 0, inComponent: 0, animated: false)
            textField.becomeFirstResponder()
        }
    }

    @objc private func done() {
        if values.any {
            let row = picker.selectedRow(inComponent: 0)
            value = values[row]
            delegate?.doneWithSelected(index: row, sender: self)
        } else if dateDelegate != nil {
            changedDate(datePicker)
            dateDelegate?.didSelect(date: datePicker.date)
        }

        endEditing(true)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { $0.alpha = 0.5 }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { $0.alpha = 1 }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { $0.alpha = 1 }
    }

    // MARK: - UIPickerViewDataSource
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return values.count
    }

    // MARK: - UIPickerViewDelegate
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return "\(values[row])"
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        if row < values.count {
            value = values[row]
            delegate?.didSelect(index: row, sender: self)
        }
    }

    // MARK: - UIDatePicker
    @objc func changedDate(_ sender: UIDatePicker) {
        let date = sender.date
        value = DateFormatManager.shared.formatter(dateFormat).string(from: date)
        setUpView(for: .selected)
    }
}
