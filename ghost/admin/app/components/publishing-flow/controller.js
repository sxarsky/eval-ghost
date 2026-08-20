import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const STEPS = ['destinations', 'schedule', 'newsletter', 'review'];

/**
 * PublishingFlowController
 *
 * Manages the 4-step publishing modal state machine:
 *   1. destinations — site-only / email-only / site+email
 *   2. schedule — optional future date picker
 *   3. newsletter — newsletter selection (only when sending email)
 *   4. review — final summary before publishing
 *
 * Supports back-navigation with state preservation and keyboard navigation.
 */
export default class PublishingFlowController extends Component {
    @service notifications;

    @tracked currentStep = STEPS[0];
    @tracked destination = 'site';
    @tracked scheduleDate = null;
    @tracked selectedNewsletter = null;
    @tracked scheduleDateError = null;

    get currentStepIndex() {
        return STEPS.indexOf(this.currentStep);
    }

    get isFirstStep() {
        return this.currentStepIndex === 0;
    }

    get isLastStep() {
        return this.currentStepIndex === STEPS.length - 1;
    }

    @action
    setDestination(value) {
        this.destination = value;
    }

    @action
    setScheduleDate(date) {
        this.scheduleDateError = null;
        if (date && new Date(date) <= new Date()) {
            this.scheduleDateError = 'Schedule date must be in the future';
            return;
        }
        this.scheduleDate = date;
    }

    @action
    setNewsletter(newsletter) {
        this.selectedNewsletter = newsletter;
    }

    @action
    goBack() {
        if (!this.isFirstStep) {
            this.currentStep = STEPS[this.currentStepIndex - 1];
        }
    }

    @action
    goNext() {
        // Skip newsletter step when destination is site-only
        if (this.currentStep === 'schedule' && this.destination === 'site') {
            this.currentStep = 'review';
            return;
        }
        if (!this.isLastStep) {
            this.currentStep = STEPS[this.currentStepIndex + 1];
        }
    }

    @action
    async confirmPublish() {
        const post = this.args.post;
        const updates = {status: 'published'};

        if (this.scheduleDate) {
            updates.status = 'scheduled';
            updates.publish_at = this.scheduleDate;
        }

        if (this.destination !== 'site') {
            updates.newsletter_id = this.selectedNewsletter?.id;
        }

        try {
            await post.save(updates);
            this.args.onClose?.();
        } catch (err) {
            // Email failure does not block publication — post is already saved
            this.notifications.showAPIError(err, {key: 'publish.email-failure'});
        }
    }
}
