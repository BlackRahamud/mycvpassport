/**
 * react-app-rewired override for CRA's webpack config.
 *
 * Single purpose: silence the "Critical dependency: the request of a
 * dependency is an expression" warning that fires from inside unpdf's
 * worker setup. unpdf uses `require(...)` with a runtime-resolved path
 * to load the right pdfjs build for the target environment — webpack
 * can't statically analyse it. The warning is benign (the require
 * resolves correctly at runtime), but Vercel sets CI=true which makes
 * CRA promote every warning to a fatal error.
 *
 * Before this file existed we worked around it by setting
 * `build.env.CI = "false"` in vercel.json, which silenced ALL warnings
 * across all future deploys. This filter is surgical: only the unpdf
 * warning is muted, real warnings still fail the build.
 *
 * https://webpack.js.org/configuration/other-options/#ignorewarnings
 */

module.exports = function override(config) {
  const existing = Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : [];
  config.ignoreWarnings = [
    ...existing,
    // unpdf worker loader — runtime require() that webpack can't follow.
    (warning) => {
      const msg = String(warning?.message ?? "");
      const isCriticalDep =
        msg.includes("Critical dependency: the request of a dependency is an expression") ||
        msg.includes("Critical dependency: the request of a dependency is an expression.");
      if (!isCriticalDep) return false;
      const file = String(warning?.module?.resource ?? warning?.module?.identifier?.() ?? "");
      return /node_modules[\\/](unpdf|pdfjs-dist)/.test(file);
    },
  ];
  return config;
};
