# Notebox: Platform Targets

This document records product and engineering decisions about which platforms Notebox supports and which are explicitly out of scope. It exists so future work does not spend effort on targets we will not ship.

## Mobile: Android only

- The mobile app targets **Android** as the sole mobile platform.
- Implementation, testing, and release planning assume Android-first tooling and APIs (for example, Android Storage Access Framework where relevant).

## iOS / iPhone: out of scope permanently

- **iPhone and iPad are not supported** and are **not** a future goal.
- There is **no** plan to add iOS, to prioritize iOS parity, or to sort or rank work with iOS in mind.
- Do not propose iOS-specific builds, App Store work, or cross-platform abstractions whose main justification is eventual iOS support.

## Desktop (future): Linux (Fedora / GNOME)

- A **desktop application** is a plausible **future** direction, separate from the current mobile focus.
- When that work happens, the intended environment is **Linux**, with **Fedora Workstation** and the **GNOME** desktop as the primary reference stack (not a commitment to ship date or feature parity with Android).

## Summary

| Platform              | Status                                      |
| --------------------- | ------------------------------------------- |
| Android (mobile)      | In scope — current focus                    |
| iOS / iPhone / iPad   | Out of scope permanently — do not pursue    |
| Desktop Linux (Fedora / GNOME) | Future possibility — not current MVP scope |
