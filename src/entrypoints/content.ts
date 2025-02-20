export default defineContentScript({
  matches: ['https://*/*'],
  async main(ctx) {
    console.log('Hello content, ', ctx);
  },
});
