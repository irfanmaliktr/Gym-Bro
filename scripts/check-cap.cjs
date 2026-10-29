try {
  require('@capacitor/core');
  console.log('yes');
  process.exit(0);
} catch (e) {
  console.log('no');
  process.exit(0);
}
