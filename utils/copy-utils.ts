export class CopyUtils {
    static copyToClipboard(text: string, onTextCopied: () => void) {
        // Hack for Safari - if there is no text selected, you can not trigger copy command
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.value = 'any';
        input.focus();
        input.select();

        const listener = (event: ClipboardEvent) => {
            event.clipboardData?.setData('text/plain', text);
            event.preventDefault();
            document.removeEventListener('copy', listener);
            document.body.removeChild(input);
            onTextCopied();
        };
        document.addEventListener('copy', listener);
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('copy');
    }
}
