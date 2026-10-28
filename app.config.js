module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE !== "apk") {
    return config;
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: ["armeabi-v7a", "arm64-v8a"],
            useLegacyPackaging: true,
          },
        },
      ],
    ],
  };
};
