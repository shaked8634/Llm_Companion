export default defineContentScript({
  matches: ['https://*/*'],
  main() {
    console.log('Hello content.');
  },
});
