# Stitch assets inventory (W1-2)

Source: `stitch_mirra_ai_personal_trainer/*/code.html` + `screen.png`.
Download status: **not downloaded** (inventory only). Do not modify `apps/` until a follow-up ticket.

## 1. Screen PNG checklist (S01–S24)

| ID | Folder | `screen.png` |
| --- | --- | --- |
| S01 | `s01_splash` | ✅ |
| S02 | `s02_welcome_hook` | ✅ |
| S03 | `s03_goal` | ✅ |
| S04 | `s04_experience` | ✅ |
| S05 | `s05_body_stats` | ✅ |
| S06 | `s06_target` | ✅ |
| S07 | `s07_equipment` | ✅ |
| S08 | `s08_schedule` | ✅ |
| S09 | `s09_diet_prefs` | ✅ |
| S10 | `s10_mirror_capture` | ✅ |
| S11 | `s11_generating_week` | ❌ **MISSING** — **note: S11 PNG missing** |
| S12 | `s12_week_reveal` | ✅ |
| S13 | `s13_paywall` | ✅ |
| S14 | `s14_auth` | ✅ |
| S15 | `s15_today` | ✅ |
| S16 | `s16_live_workout_hud` | ✅ |
| S17 | `s17_workout_complete` | ✅ |
| S18 | `s18_fuel` | ✅ |
| S19 | `s19_log_meal` | ✅ |
| S20 | `s20_daily_check_in` | ✅ |
| S21 | `s21_rebuild_preview` | ✅ |
| S22 | `s22_progress_gallery` | ✅ |
| S23 | `s23_mirror_comparison` | ✅ |
| S24 | `s24_profile_settings` | ❌ **MISSING** — also missing |

Also present (orphan, not a screen folder): `image.png/screen.png` (~1.6MB) — ignore or triage separately.

**Summary:** 22/24 screens have `screen.png`. Missing: **`s11_generating_week`**, **`s24_profile_settings`**.

## 2. External image URLs (by screen)

All raster assets are Google AIDA (`lh3.googleusercontent.com/aida-public/...`). No local relative image refs in HTML. Screens with zero `<img>`: S01, S03–S05, S07–S10, S14, S17, S20.

### S02 — `s02_welcome_hook` (Welcome hook)

1. **hero-runner-silhouette** — `Athletic high-contrast silhouette of a runner stretching dynamic pose isolated o…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuC6yaND2E7J8Wv7D0nfISKZK-LJTn_B79OA2EG5JWvoYKEMmr_-fL-3_Pfg0SQDACRytiYSItfsB7ruusvJvdyQHjSWR3Qr4rwXbtE6ZhK100zETZp4LJk9GCjDaqwdv8IN5LFq8G2GnSBSZkBVgQS6SS4WMgp2If1S4-SGCK_ALi0hFG_2ExFcaC9H89Cp5Fla7XuxVvvK0WQoS6xK7ioBaPCHCFcFvJPdNlmuO5Mp`
   - Target: `apps/mobile/assets/stitch/s02_welcome_hook/hero-runner-silhouette.jpg`

2. **portrait-woman-athlete** — `Close up portrait profile of an athletic woman smiling softly in dark gym lighti…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuB4eY3IjzJa6KCV1-qJRuweNb0e90Bovmryiir-8UNqnPBmzQMlvq9FB4leECroVA_hqucUhPd21DNOqNC1iY_jDMZJdwJ0uX9c36_aFjRVto9vPvXuXfHaJaosmG7R2ar3O1u526Bvh_BVUjmoAbYdxE4bFipd8sbWErR-cZaVgiQuPOH_6XPhosABAhTCk3n0vgQA7n0f-WM_YC15VfQOZsUU2MemPynWHs3AJv6M`
   - Target: `apps/mobile/assets/stitch/s02_welcome_hook/portrait-woman-athlete.jpg`

3. **portrait-male-crossfit** — `Portrait of an energetic male crossfit athlete smiling in dark workout apparel m…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuDffJoXakI3P1xaWdNu12Bd_lbwLas6qIUHFcl-91EwtLFvN4r-t33Td6ZSJoaMVvZbG_aTinGdnL-v0vi8wEAMfnBL5ocp9G-kva9oHDNi34bdw_mHrZtOVrVayfoRU-Suwj8iRsGfwW88neRtbJC6Gm9RMeoOBtysocmiZM1mLg3pioi0ymav0bRKUwY9lXK6yvqidhT8wZksoHG8_p_pWyuxUfwufAIfLSP8meNP`
   - Target: `apps/mobile/assets/stitch/s02_welcome_hook/portrait-male-crossfit.jpg`

### S06 — `s06_target` (Target)

1. **athlete-tying-shoes** — `High performance male athlete tying training shoes in a minimalist dark gym sett…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuCmfmavlZvxJ8oQXpGKl-LF1wYViHfI3Fkmm_AkWP7RB25ahDgEtFZBjCAnTPtsVMgEIdshD-nBbzsTdvtuV5j6b94GiQCqkQRVLRckASRdSPnai72K93tMlaXRzkkkR8TwurYNA5KoY-azRGpo_CTFTQaBpBBQoyqki4aiRcqZlOpgT_sp5F2Tpbw7UlYrpFYDJqbYV5ELx5xWiCZx_cQtux3lew3JLfLlE-4rWi4v`
   - Target: `apps/mobile/assets/stitch/s06_target/athlete-tying-shoes.jpg`

### S11 — `s11_generating_week` (Generating week)

1. **athlete-squat** — `Athletic man in black compression top performing explosive squats in modern trai…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuBDtiGv3YSwLRgli6YguYQNxL24XqfXBb53NksCJZUjyBXJhPg53OL5hPmEtXQcdAmNyY8eWNxMds3fJPEiw2XGSCZmQQZLeobtKbqiJvIRwQ3J5oH8hibf0ACU_-tV2vUUylMpU8ub2Zb9bA3E88C0__TRar3D38E46CM2KFnsC4ktIxH2I4WUNLBMjlhTtH1xt7XgZsTL-g89IouWTJzL9SKqs0AnujJqp6igj4Oq`
   - Target: `apps/mobile/assets/stitch/s11_generating_week/athlete-squat.jpg`

2. **sprinter-kneeling** — `Muscular male sprinter kneeling on track in deep focused stretch posture with dr…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuB7TlKD2f48VobbIFwH3LVh6K7yrPR7AokzLfUyDdLdp1R9SjRw6YUx3UQUhAnqP31UK-Yd9wXP6ARdkHna2Tjai0jffl7IpCyp5VkalYievRrz6mvR6_3o9KJRwRi0FWgCIFLxvprETftaM-QjVxXby5omVRILL8wOS2-kih2brFf_DotxtSeMSM1-5AA3CStgmQ9YkVwArHUSLGSWT2ctBWu6flf397PXJ8qq9ln1`
   - Target: `apps/mobile/assets/stitch/s11_generating_week/sprinter-kneeling.jpg`

3. **athlete-barbell** — `Focused athlete gripping barbell during high intensity resistance training in mi…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuDZ5MzWGrsT17eENf_6I7CbZyd87HA-FWYmfhxpQg9buAL_90sPxFxD2nqDw_TLKNtJJS4stD4KRvbMQieSXNXJeGNNMD25aLJlj6NFyHjtx6ZgOwE5jXJBHDU6_1-tB701wpj5IHnAtqK84dKoUz34AGKk8O6ACinjEStC4tc_ZRzAGZoIE2sK0_XAb5QohfAgMjxlPU7DdTHBxXssLH9S_B2pYvgxoKATpNoEXCLg`
   - Target: `apps/mobile/assets/stitch/s11_generating_week/athlete-barbell.jpg`

### S12 — `s12_week_reveal` (Week reveal)

1. **dumbbell-overhead-press** — `Athletic man in slate compression gear performing focused dumbbell overhead pres…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuBBnZIzDrz6U17J5H5lukQVBCaoMpesKO8qsMjdZCN-Tgl03fQD99bPww3jqeI-_bo1CllsLJUmgRI4CDgkTWkajsw7mbT8sKIH6iKv5pVqwqz6cOaa_lUJM7GsKXaKirTFuI5SbAESRGu-xdvxXnKKI0c1ffds51v4kk3rruGT8Bpu5Kbem8wGIa68zCMZf-qte85OGK6dGwYk_ZRPGoXzWZ_4jncouPIqwEOYB6vx`
   - Target: `apps/mobile/assets/stitch/s12_week_reveal/dumbbell-overhead-press.jpg`

2. **barbell-bent-over-row** — `Athletic man performing barbell bent-over row in high performance dark gym, dram…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuDAT-X2G4IWqW_2CXK5cVkJiRFwoVrttHoe2gU3KWlztWROXyW1MGPVdVgDeW_k-ENSQu6dWRwhCDEfcsVCSihVk05ZfxzPkWyOZzgM55eoulQFka2Zr2qTz73VQgfiTBcVtYXK7onJv-tzAnyOOVTQ-BX3rlLl2r_NtppnNDgbAxJkCXE09K1mAS4UBKC-GpL_KomHXVU_JqP1iwnBXoZHX5emdxKo4IyhVhDfy_Zu`
   - Target: `apps/mobile/assets/stitch/s12_week_reveal/barbell-bent-over-row.jpg`

3. **barbell-back-squat** — `Powerful fitness athlete deep in barbell back squat posture at rack, low angle h…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuC5iULn2Rwpqp8akDq_uqE7FLMmxTyBx4MpP5LPdWlaWGVb_l490PBzBt7bL2u7UBwmaNS4VrAu-dAVMmGJcwTFdmayJAB2hgxffq4Hln8JtAd6VYE9lwtV4Krvys7A5jktje9c9FJK82ZPtzl_aL5ct65DYBGwge-ir0kY_lfU0LQYpTSh-h2sLi2riUi65npEAh45AfZInH_5qsIExeWpONu_erhRcIDcOCOwjplk`
   - Target: `apps/mobile/assets/stitch/s12_week_reveal/barbell-back-squat.jpg`

### S13 — `s13_paywall` (Paywall)

1. **coach-cutout** — `Dynamic fitness coach cut out on charcoal background in studio lighting with ele…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuBHHbRQA6DkI1-PRxw8tVGC8fDWEh67oTGI0JACct3Jjsdf5yThyOso1W_v_BrCo-_behs4tbmM-qtm4QSJSWiwye71wJIUxrlBknsBSogwJprm0iUUprHH3SRTe4NuY-9ZOaU8qyz1Oe8SK6cvLEKzsRX-rASoj4tTdkfysDDijEP_Dm8yx1pB_TynmLrW5_NQSml-hpdxbA11k2zzcMFO-EbnX2nwWxsOawT_aWYe`
   - Target: `apps/mobile/assets/stitch/s13_paywall/coach-cutout.jpg`

### S15 — `s15_today` (Today)

1. **athlete-mid-motion** — `Athletic man in black sleeveless sportswear posing mid-motion against clean stud…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuCPy64WREFz4oYagXaARD1g8kFcd0gmZb8kS2VKkE1aXonllsElnXLzP2EIZkRILtuDb5p7RncxlrpESn5iFCuUj9l4Bv_CzPWDQ9W6_GFQTL_SrqtmNM-3HfMhajmUiiyzWYD6RNboUjykXTbKwxzp4QjTiItASLmVjzjVnb8XH5HagcUMqUoGdUST7mXJcG4WJeXfnxrJ3o3FUlwsbVR7ASZj3d7KHysQq1r97hja`
   - Target: `apps/mobile/assets/stitch/s15_today/athlete-mid-motion.jpg`

2. **trainer-squat** — `Athletic trainer performing intense squat workout in dark high-end gym ambient l…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuBES7SeBXTvZJQIRGM13E8mKCdUG1mHsN3Mg7RKJYCtIjMmg5y-d-hvNmIm6ttYs74aNV2_cEgYXH6WDiz_kqfnR_49kWL6GSOn6Qpaa8yiXvOl7alfqE5lrhmQMiaB-ImFRXBaTJGk8PF3IkPH4oCAE7Rtx6kKMgbAyOyaUUe4kPoa0wvNIL1RDGZe0s2MH6WduOn5BqZmdta1ow1fUFWcxJcpX74WpGxzDcHIdFJs`
   - Target: `apps/mobile/assets/stitch/s15_today/trainer-squat.jpg`

### S16 — `s16_live_workout_hud` (Live workout HUD)

1. **athlete-deep-squat** — `A focused athletic male performing a deep squat inside a moody professional gym.…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuA-auxBDxWNZNJP4gbyGKX0ZugeR4zUb8keg2jYG0N6tvzExnHxL2vGqFnia_ieWs1VPFozbGJ2SdSyuYON3VoosZxEUnAF3LTuAVo2xCqX6fcY-0K7Gk6emwrYpHmA56CBDjF3Eyhbe-e06Dp_7dEEDhv2E1J5VHMPErprVupqoTHBEvqL3tQG_UJnj39TQDloDAMj4ysKiB-vJJ6nAxp3vlPC0OF39udIoYQ-71Sd`
   - Target: `apps/mobile/assets/stitch/s16_live_workout_hud/athlete-deep-squat.jpg`

### S18 — `s18_fuel` (Fuel)

1. **meal-protein-oats** — `Overhead athletic macro plate with protein oats, blueberries, crushed almonds an…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuBpVrztfQ1cgAtCDX3Q9OJ-F_trYrdqWc73BGv6gMNwbA-gOagv0oJmrVVrmy56BC2s527WX6S-L4jy3ERgU--ae6KbOB24omhnUtqYKDTH4kb4C_lBIibCezHcyeCKTrjQ1Fw1P12UFtt9d6ex8iPe-p8yUVS8vqWJvawmXY1bhvgkNyAg6ppTRnpwt0n-C6XtebSZOjcVvXde_TR36X29NBydUM5g9Aw5bBJIGz2H`
   - Target: `apps/mobile/assets/stitch/s18_fuel/meal-protein-oats.jpg`

2. **meal-chicken-quinoa** — `Grilled herb chicken breast bowl with tri-color quinoa, sliced avocado, steamed …`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_3vl3ysAiQ8o6104vwi_lcZSIGBF2WyHdLXwPDd-z3EI4OYk3gmzK2lvpto2J4-BBXeJXC_4Tj7k5fn3HPmItUAXZzQWtZo4OF009IhcsRXOx4Ne0kSSQz0tuOSqb4YVAAW2C8cvQxoI3z285hbvpq6_FKYlqsvZmDrVzuGJxPH2rHoJ7ois6B4GqI8Ng7b6nmRcAg0RfKm_XKf1I1QbQjXJg1EWTPxMYiMp67Vc`
   - Target: `apps/mobile/assets/stitch/s18_fuel/meal-chicken-quinoa.jpg`

3. **meal-salmon-asparagus** — `Seared wild salmon fillet over roasted sweet potato wedges and asparagus spears,…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAKHPbJNFm7kSQqj_Wu75fzR-hzmsoQKCQX0Ozn_Rh82v1m5YCnruGTn3Uy2LazayGPbhrThAoB-vtnWmFney5cdMpvkcvM-iiflSoZ6F_R1UW_RH-sra5kzrRxZ907Z1MJzcLF1g_0yYWFnF26-0RnzpgEFe9qnlJY83atbEyIpon38QDzDMd14OLE7R1lKv50d9RoUCKUk4OTMIFiv-6Ryv5qL9woTepPT9MPxc1j`
   - Target: `apps/mobile/assets/stitch/s18_fuel/meal-salmon-asparagus.jpg`

### S19 — `s19_log_meal` (Log meal)

1. **meal-flank-steak** — `Gourmet high-protein athletic meal featuring sliced medium-rare flank steak with…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuA3NVnxLtSoFFCJo93x_tsFkdgR3zgu5LxhocvXdIM2R-8Uo9hTPfdVnr-rx83FOO9AQrWGLObBDwYOi8jYz67IgGa6VirN2BF0aDt_hwJvWlTIcgx_cvXbZ9LlTVv3H0QzfjsiJQJjrFiAuObVbvGDuKVY13WQTQqbPy0FBhCFBjVmOtMWNPp1Yl9JIf8AjkjCfb82-F1kZggqw01buAD0ZizyrMd00jRBgNoHy_Gv`
   - Target: `apps/mobile/assets/stitch/s19_log_meal/meal-flank-steak.jpg`

### S21 — `s21_rebuild_preview` (Rebuild preview)

1. **athlete-stretching** — `Athletic fitness athlete stretching dynamically in a dark minimalist training fa…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuByHALhpPiKMckHIWN3Cn0hBGFmS4JhVyI4LEqfj6TgV1fcSmHm6WyTpw26HAcOMF-0ky2q4VZqulXvzZsR6cKY8iNKMw36k9wrKY2JZAkKZIghFsww31Er4A6CYFAq3zSQawxC34s0eI0VotbvTqvp0RUU-wrTavSYHZkroKEeqDoR8KDigq83j3xUeL_kFvfxGvOmHaCX05_k8ekn-G8uDWZskYrMZPcaASL2p8de`
   - Target: `apps/mobile/assets/stitch/s21_rebuild_preview/athlete-stretching.jpg`

### S22 — `s22_progress_gallery` (Progress gallery)

1. **checkin-baseline-studio** — `Athletic male front physique mirror check-in portrait taken under cool studio li…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAredj53Jzf-3F2CWn104p-ZKq9NGD6daETIG-hSj7aR3njEnm06H6wWY5L4bMW-d2i27Zq3kW3_pg_h3HPfVCsmZVWXxgHgPb8-wcY7QduyDGjKPr2nHQuazFccYizp6Owh3qbbkYJADrdkJVs9KqYl46pXQzjqdk2VX70cPlnKV154kr-PH_IxY92V4GCZZaYPduS0odaXiLuwPDnJR-wYOlkdoWIPTZExlwsLeMp`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-baseline-studio.jpg`

2. **checkin-locker-defined** — `Athletic male front mirror physique update in high definition gym locker room se…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAUFiAUfsGHv-J8jy2DenNU-4x-Ubb_E5HoMvLAGO8ISPl_21JyjmgZbw3c3UVgolqSxaKAteaYFKbblmRPpZFSji20dn4B4SQVom8Xq21gH1SUfBok7VHQ5LUNXNXKCZpafBLYhKZJJ7opwHVGMQw-GKyhEm2V9dOlFqVHr35TzSsWlHjSqhSVIL8ge2Nnet1lMF1qCqMlbQDL74ZeMDIiyZPloVx7xfYl-WY975OU`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-locker-defined.jpg`

3. **checkin-upper-body** — `Upper body muscular front athletic profile check-in photo in studio gym locker s…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAReZEQfGCKj26e56LNxa69gJKg9ywYE9g97XqGx4Jt3Ned16IUbhKleQhHbaazcDE9v-r7-jDuAbLso8mxAI6qDA3LkGQXy-JmeccLt1aE5NljVa5XuH7a3Xx93NBQXQAUx__JZOy6nFWyK_z4xpPHjwgEMAGPLNGe5nZttmoh_XhbKURVfAm_fqSHV9l0ele_jAiEa3SGjTHAB7APfVQXNJ6FkTnY20Appnxg9YcX`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-upper-body.jpg`

4. **checkin-mid-phase** — `Athletic mid-phase progress selfie in gym changing room, natural daylight illumi…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuCOu5NGPu3ko4mvXqwzyzKENm1o_NYZekAgqlruR8A8YQOCvBj7qqANTsoHFlNTyQ6spcHaXOVBuWzb46ZY2_brEhwyuHo6l1fwQc_p7loSLI02a0-VvcfMVj7_ReMsCTJbKPzqcalwe3Bk25uSjemrHuPig-_ZI53fAm15SgndbffQpcouTShRCOmY4mbFbSpWnFfntz1hbtHA-d8DchUEeCX90SxpnsALXuxMRi5L`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-mid-phase.jpg`

5. **checkin-apartment** — `Fitness body check-in mirror reflection shot in ambient dark apartment setting w…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuCZJgxMRppPd1KySMq3v2A1BdCL9qzeYS46sS3nkGtb81yHHVSowLLUGclWgtYmeF30_9Lx879XSYv2rqWNfvJXh0dkaLOFQodxD0Xaf_y8swIbFvGzn-2onchMojbcfUZFWReG0MxKow_0pnioebbAGpZCjlqpwEPOPkkgBmFadw5vjk8hMIWt_lwYM_KlMDSUoBn5qgJGweb_I4jgoeJ3yYaXjLlO131nG6_8locf`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-apartment.jpg`

6. **checkin-day-one** — `Starting fitness journey mirror check-in portrait, neutral body posture under wa…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuCQdH_lXIMcUZklNACrdLVzXBamw45xtjc4J8cJfSR4qWZ99h9J7OnoJQh9_iGvmM2_vWtVsNeLGVDJtcTfHLWuik9Cs0ry8MTufFlyp-R9Uwh9BecZvBzzEbGet01QnpSGEMeT9auXg6_8eqoU0rEu31NeydDHRunRVwvZnWa34RrID-_B45GYhHRwWwhxXd_hWeN4oVPZrnYuZfddYIOcOn5XzlQ4pkrrxbT04D-q`
   - Target: `apps/mobile/assets/stitch/s22_progress_gallery/checkin-day-one.jpg`

### S23 — `s23_mirror_comparison` (Mirror comparison)

1. **progress-after** — `Athletic fitness progress selfie, front view, post workout showing lean defined …`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuDx2reQUumSJ79wGlS-apKzMrf82GAe5SEwYACc3U30nVAhhJ_ampYNWlsD4fGIeey79GKVatQgW4spG6DGlm22oXj2MaVpSG6hhG3l7kyolgkEYIRLLpKhYIi0fVX7m4-Xxq9iq8pbF0_EG5-Ps9clXktlMr37ya_Le95lWd-eBTKzsHwJLKgLBEtgt-5UFoSvHzEgQt5TBLFhDFCRIEA1jq0biePTLh4ppatQlu-g`
   - Target: `apps/mobile/assets/stitch/s23_mirror_comparison/progress-after.jpg`

2. **progress-baseline** — `Athletic fitness baseline physique photo on day one, front view mirror selfie wi…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuAJE_lbzIlL82fW9KGYWDRHlUDtFmRsYiSx3Wxi32yTTyluCUHcu7ZvU1uzKTOyPVaWOIaiJpWeoJPwasRvM4aoBfRI0ieYL1Rhvrw70c2T682PundTUV2yoHaO0dRkVlnmLwV3LVzu7StiZ47ylm8PyGv2i18fOX2Z27wo_ZToGOIr6KwrVeabsdkxMLNShbmcuVyroQ0hfkTeAPfAnQY0rM3Dtcsv8NnaPmRFdHF0`
   - Target: `apps/mobile/assets/stitch/s23_mirror_comparison/progress-baseline.jpg`

### S24 — `s24_profile_settings` (Profile settings)

1. **avatar-alex-chen** — `Close up studio portrait of an athletic East Asian fitness user Alex Chen wearin…`
   - URL: `https://lh3.googleusercontent.com/aida-public/AB6AXuATHXsm18kI9izlIo_jqWFzHHT-CU4WhRcUz0JBwraLOmjsr5T_GVbJ8Ay4SRgot2ymQLtDCk7H9V38sUmzxc_SE0Z-6uT59URB5EBk9uyhdOH-ylXXVDOaMH9_1C8huYhfQJ6tfQ-c7TbQdyDPEuX4s7LZS5rXDSFagaAXLlTFjNZEPnA8tJClYIHHm3fMr5TuDhqObuXKVXYxD3qC_Av4Hw6ECFjgaHRCkCXkwtP1`
   - Target: `apps/mobile/assets/stitch/s24_profile_settings/avatar-alex-chen.jpg`

**Total:** 28 unique external images across 13 screens.

## 3. Recommended download layout

```
apps/mobile/assets/stitch/
  s02_welcome_hook/{hero-runner-silhouette,portrait-woman-athlete,portrait-male-crossfit}.jpg
  s06_target/athlete-tying-shoes.jpg
  s11_generating_week/{athlete-squat,sprinter-kneeling,athlete-barbell}.jpg
  s12_week_reveal/{dumbbell-overhead-press,barbell-bent-over-row,barbell-back-squat}.jpg
  s13_paywall/coach-cutout.jpg
  s15_today/{athlete-mid-motion,trainer-squat}.jpg
  s16_live_workout_hud/athlete-deep-squat.jpg
  s18_fuel/{meal-protein-oats,meal-chicken-quinoa,meal-salmon-asparagus}.jpg
  s19_log_meal/meal-flank-steak.jpg
  s21_rebuild_preview/athlete-stretching.jpg
  s22_progress_gallery/checkin-*.jpg  (6 files)
  s23_mirror_comparison/{progress-after,progress-baseline}.jpg
  s24_profile_settings/avatar-alex-chen.jpg
  _screenshots/   # optional copies of screen.png for QA (S01–S24)
```

Naming: `{screenFolder}/{semantic-kebab}.jpg`. Prefer `.jpg` unless source is PNG; keep original extension if detected on download. License-check AIDA URLs before shipping.

## 4. Fonts referenced

| Family | Role | Source |
| --- | --- | --- |
| **Space Grotesk** | Display / headlines / labels (`wght` 600–700; some screens load 100–900) | Google Fonts CSS2 |
| **Plus Jakarta Sans** | Body (`wght` 400–700; some screens 100–900) | Google Fonts CSS2 |
| **Material Symbols Outlined** | Icons (opsz/wght/FILL/GRAD axes) | Google Fonts CSS2 |

Also loaded on every screen: `https://cdn.tailwindcss.com` (dev preview only — not a mobile asset).

Aligns with `kinetic_performance/DESIGN.md` typography (Space Grotesk + Plus Jakarta Sans). Icons are Stitch-only; map to Expo/`@expo/vector-icons` or bundled Material Symbols later.

## 5. Color tokens vs `kinetic_performance/DESIGN.md` (flags only)

- **No CSS custom properties** (`--*`) in HTML. Colors live in Tailwind `theme.extend.colors` (identical 47-token map on all 24 screens).
- **HTML tokens == DESIGN.md YAML frontmatter** — no per-token value diffs.
- **Flag: prose “Brand & Style” palette ≠ YAML / HTML tokens** (resolve which wins for `apps/mobile/src/theme/`):

| Role | HTML / YAML token | Prose brand |
| --- | --- | --- |
| Canvas | `background`/`surface` `#131313` | `#121212` |
| Elevated card | `surface-container-low` `#1c1b1b` | `#1A1A1A` |
| Nested layer | (none exact) | `#242424` |
| Electric lime | `primary-container` `#cbf150` / `primary-fixed-dim` `#b0d434` | `#D8FF5C` |
| Lavender | `secondary` `#d1beef` | `#C3B1E1` |
| Destructive | `error` `#ffb4ab` | `#FF6B8A` |
| Secondary text | `on-surface-variant` `#c5c9b0` | `#A3A3A3` |

- Architecture rule (`docs/03-engineering/architecture.md`): **Stitch HTML wins for visuals** → prefer YAML/HTML tokens over prose hex when implementing theme.
- Extra hardcodes (not design tokens): **S14 auth** Google brand colors `#4285f4` `#34a853` `#fbbc05` `#ea4335`.

## Notes

- Re-export or capture `screen.png` for S11 and S24 before visual QA.
- Binary download deferred (W1-2 inventory only).
