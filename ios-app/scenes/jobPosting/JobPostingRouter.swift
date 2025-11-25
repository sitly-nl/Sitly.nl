import UIKit

extension Router {
    private static var jobPostingNavigaionController: UINavigationController = {
        $0.isNavigationBarHidden = true
        return $0
    }(UINavigationController())

// MARK: - Search
    class func jobPostingExplanation() -> JobPostingExplanationViewController {
        let controller = JobPostingExplanationViewController()
        controller.showJobPostingSearch = { [unowned controller] in
            controller.dismiss(animated: true) {
                Router.rootViewController.present(Router.jobPostingNavigaionController, animated: true)
                Router.jobPostingNavigaionController.setViewControllers([Router.jobPostingAvailability()], animated: false)
            }
        }
        return controller
    }

    class func showJobPostingInfo() {
        let controller = Router.jobPostingExplanation()
        controller.showClose = true
        jobPostingNavigaionController.present(controller, animated: true)
    }

    class func jobPostingAvailability() -> JobPostingAvailabilityViewController {
        let controller = JobPostingAvailabilityViewController.instantiateFromStoryboard()
        controller.presenter = JobPostingAvailabilityPresenter(view: controller)
        controller.presenter.showNext = Router.showJobPostingStartDate
        return controller
    }

    class func showJobPostingStartDate(searchForm: JobPostingForm) {
        let controller = JobPostingStartDateViewController.instantiateFromStoryboard()
        controller.presenter = JobPostingStartDatePresenter(view: controller, searchForm: searchForm)
        controller.presenter.showNext = { form in
            if form.needsDayCare {
                Router.showJobPostingDayAvailability(searchForm: form)
            } else if form.hasAfterSchool {
                Router.showJobPostingAfterSchool(searchForm: form)
            } else {
                Router.showJobPostingFilter(searchForm: form)
            }
        }
        jobPostingNavigaionController.pushViewController(controller, animated: true)
    }

    class func showJobPostingDayAvailability(searchForm: JobPostingForm) {
        let controller = JobPostingDayAvailabilityViewController.instantiateFromStoryboard()
        controller.presenter = JobPostingDayAvailabilityPresenter(view: controller, searchForm: searchForm)
        controller.presenter.showNext = { form in
            if form.hasAfterSchool {
                Router.showJobPostingAfterSchool(searchForm: form)
            } else {
                Router.showJobPostingFilter(searchForm: form)
            }
        }
        jobPostingNavigaionController.pushViewController(controller, animated: true)
    }

    class func showJobPostingAfterSchool(searchForm: JobPostingForm) {
        let controller = JobPostingAfterSchoolAvailabilityViewController.instantiateFromStoryboard()
        controller.presenter = JobPostingAfterSchoolAvailabilityPresenter(view: controller, searchForm: searchForm)
        controller.presenter.showNext = Router.showJobPostingFilter
        jobPostingNavigaionController.pushViewController(controller, animated: true)
    }

    class func showJobPostingFilter(searchForm: JobPostingForm) {
        let controller = JobPostingFilterViewController.instantiateFromStoryboard()
        controller.presenter = JobPostingFilterPresenter(view: controller, searchForm: searchForm)
        controller.presenter.editAvailability = {
            jobPostingNavigaionController.popToRootViewController(animated: true)
        }
        controller.presenter.successfullyNotified = { [weak controller] state in
            controller?.dismiss(animated: true, completion: {
                Router.showPopUp(
                    title: "popUp.jobPosting.notified.title".localized,
                    description: "popUp.jobPosting.notified.description".localized,
                    closeText: "close".localized)
                Router.showNotifyingOverlay(jobPosting: state)
            })
        }
        jobPostingNavigaionController.pushViewController(controller, animated: true)
    }

// MARK: - Overlay
    class func showNotifyingOverlay(jobPosting: JobPosting) {
        Router.rootViewController.viewControllers
            .firstOfType(TabBarController.self)?
            .viewControllers?.firstOfType(SearchViewController.self)?
            .showJobNotifyingOverlay(jobPosting: jobPosting)
    }

    class func notifyingOverlay(jobPosting: JobPosting) -> JobNotifyingOverlayController {
        let controller = JobNotifyingOverlayController(jobPosting: jobPosting)
        controller.showDetails = { [unowned controller] in
            Router.showJobPostingDetails(jobPosting: controller.jobPosting)
        }
        return controller
    }

// MARK: - Details
    class func showJobPostingDetails(jobPosting: JobPosting) {
        if jobPosting.handleStartTimeExceed ?? false {
            Router.showJobPostingContinueConfirmation(jobPosting: jobPosting)
        } else {
            let controller = JobNotifyingDetailsViewController.instantiateFromStoryboard()
            controller.presenter = JobNotifyingDetailsPresenter(view: controller, jobPosting: jobPosting)
            controller.presenter.showBabysitters = { [unowned controller] in
                controller.dismiss(animated: true, completion: {
                    Router.rootViewController.viewControllers
                        .firstOfType(TabBarController.self)?
                        .selectViewController(ofType: TabKind.messages.vcName)
                })
            }
            controller.presenter.onJobPostingStopped = { [weak controller] state in
                controller?.dismiss(animated: true, completion: {
                    var description = "popUp.jobPosting.stopped.description".localized
                    if state.availableBabysittersCount > 0 {
                        description += " " + String(
                            format: "popUp.jobPosting.stopped.description.availableBabysitters".localized, state.availableBabysittersCount
                        )
                    }
                    Router.showPopUp(
                        title: "popUp.jobPosting.stopped.title".localized,
                        description: description,
                        closeText: "close".localized)
                })
            }
            controller.presenter.onSwitchToDailyUpdates = { [weak controller] in
                controller?.dismiss(animated: true, completion: {
                    Router.showPopUp(
                        title: "popUp.jobPosting.switchedToDaily.title".localized,
                        description: "popUp.jobPosting.switchedToDaily.description".localized,
                        closeText: "close".localized)
                })
            }
            Router.rootViewController.present(controller, animated: true)
        }
    }

// MARK: - Common
    class func showJobPostingContinueConfirmation(jobPosting: JobPosting) {
        Router.topViewController()?.present(JobPostingContinueConfirmationViewController(jobPosting: jobPosting), animated: true)
    }
}
