// Номер сборки Android берём из GitHub Actions: у каждой новой версии он больше,
// поэтому APK ставится поверх старого без удаления данных.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Number(process.env.BUILD_NUMBER ?? 1) },
});
