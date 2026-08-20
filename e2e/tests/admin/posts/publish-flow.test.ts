import {PostEditorPage, PostsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Publish Flow', () => {
    test('disabled subscription access hides email destination options in publish flow', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setMembersSignupAccess('none');

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill('Test post');
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');
        await editor.publishFlow.open();

        // New 4-step flow: Step 1 should show destination selection
        await expect(page.getByText('Where do you want to publish?')).toBeVisible();

        // When members signup access is disabled, email destination options should be hidden
        await expect(page.getByLabel('Email only')).toHaveCount(0);
        await expect(page.getByLabel('Site & email')).toHaveCount(0);
    });
});
