"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import MerchantProfileEditForm, {
  type MerchantProfileEditFormValues,
} from "@/components/profile/MerchantProfileEditForm";
import ProfileEditForm, {
  type ProfileEditFormValues,
} from "@/components/profile/ProfileEditForm";
import { updateProfileAction } from "@/lib/actions/update-profile";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";
import { buildLoginHref } from "@/lib/auth/redirect";
import { AVATAR_ACCEPT } from "@/lib/profile/avatar";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import {
  isVerifiedMerchantAccount,
} from "@/lib/merchant/identify";
import { getDisplayUsername } from "@/lib/auth/username";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMerchantStoreOptional } from "@/lib/store/merchant-store";
import { usePostStore } from "@/lib/store/post-store";
import { fetchMerchantProfileByUserId } from "@/lib/supabase/merchant-queries";
import {
  uploadAvatarToStorage,
  uploadMerchantLogoToStorage,
} from "@/lib/supabase/storage";
import { compressImage } from "@/lib/utils/compress-image";
import ChangePasswordSection from "@/components/profile/ChangePasswordSection";

export default function ProfileEditContent() {
  const router = useRouter();
  const avatarInputId = useId();
  const logoInputId = useId();
  const { user, profile, loading, refreshProfile } = useAuthStore();
  const merchantStore = useMerchantStoreOptional();
  const { syncAuthorInFeed } = usePostStore();
  const [profileValues, setProfileValues] = useState<ProfileEditFormValues>({
    nickname: "",
    bio: "",
    gender: "",
    city: "",
  });
  const [merchantValues, setMerchantValues] =
    useState<MerchantProfileEditFormValues>({
      businessName: "",
      description: "",
      address: "",
      phone: "",
      businessHours: "",
    });
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const displayUsername = getDisplayUsername(user);
  const authorName = resolveAuthorNameFromAuth(user, profile);
  const legacyMerchant = isVerifiedMerchantAccount({
    author: authorName,
    username: displayUsername,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace(buildLoginHref("/profile/edit"));
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      if (!user?.id || !profile) {
        setInitializing(false);
        return;
      }

      setProfileValues({
        nickname: profile.nickname,
        bio: profile.bio ?? "",
        gender: profile.gender ?? "",
        city: profile.city ?? "",
      });
      setAvatarPreviewUrl(profile.avatarUrl);

      try {
        const merchantProfile = await fetchMerchantProfileByUserId(user.id);
        if (cancelled) {
          return;
        }

        const merchantDetected =
          Boolean(merchantProfile) ||
          Boolean(merchantStore?.getMerchantByUserId(user.id)) ||
          legacyMerchant;

        setIsMerchant(merchantDetected);

        if (merchantProfile) {
          setMerchantValues({
            businessName: merchantProfile.businessName,
            description: merchantProfile.description ?? "",
            address: merchantProfile.address ?? "",
            phone: merchantProfile.phone ?? "",
            businessHours: merchantProfile.businessHours ?? "",
          });
          setLogoPreviewUrl(merchantProfile.logoUrl);
        }
      } catch (loadError) {
        console.error("Failed to load merchant profile for edit:", loadError);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile, merchantStore, legacyMerchant]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      if (logoFile && logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [avatarFile, avatarPreviewUrl, logoFile, logoPreviewUrl]);

  const avatarLabel = useMemo(() => {
    if (isMerchant && merchantValues.businessName.trim()) {
      return merchantValues.businessName.trim();
    }

    return profileValues.nickname.trim() || "我";
  }, [isMerchant, merchantValues.businessName, profileValues.nickname]);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setError("");
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (logoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let avatarStoragePath: string | null = null;
      let logoStoragePath: string | null = null;

      if (!isMerchant && avatarFile) {
        const compressed = await compressImage(avatarFile);
        const uploaded = await uploadAvatarToStorage(user.id, compressed);
        avatarStoragePath = uploaded.storagePath;
      }

      if (isMerchant && logoFile) {
        const compressed = await compressImage(logoFile);
        const uploaded = await uploadMerchantLogoToStorage(user.id, compressed);
        logoStoragePath = uploaded.storagePath;
      }

      const result = await updateProfileAction({
        nickname: profileValues.nickname,
        bio: profileValues.bio,
        gender: profileValues.gender || null,
        city: profileValues.city || null,
        avatarStoragePath,
        merchant: isMerchant
          ? {
              businessName: merchantValues.businessName,
              description: merchantValues.description,
              address: merchantValues.address,
              phone: merchantValues.phone,
              businessHours: merchantValues.businessHours,
              logoStoragePath,
            }
          : null,
      });

      await refreshProfile();
      await merchantStore?.refreshMerchants();
      syncAuthorInFeed(
        result.previousAuthorDisplay,
        result.authorDisplay,
      );

      if (isMerchant && displayUsername) {
        router.push(`${buildPublicProfileHref(displayUsername)}?saved=1`);
      } else {
        router.push("/profile?saved=1");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "资料保存失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || initializing) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">加载中...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-8 lg:max-w-2xl">
      <PageHeader title="编辑资料" backHref="/profile" />

      <main className="px-4 pt-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isMerchant ? (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">头像</h2>
              <div className="mt-4 flex items-center gap-4">
                {avatarPreviewUrl ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreviewUrl}
                      alt={avatarLabel}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-2xl font-bold text-white">
                    {avatarLabel.slice(0, 1)}
                  </div>
                )}

                <label
                  htmlFor={avatarInputId}
                  className="cursor-pointer rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  更换头像
                </label>
                <input
                  id={avatarInputId}
                  type="file"
                  accept={AVATAR_ACCEPT}
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </div>
            </section>
          ) : null}

          <ProfileEditForm
            values={profileValues}
            onChange={setProfileValues}
            disabled={submitting}
          />

          {isMerchant ? (
            <MerchantProfileEditForm
              values={merchantValues}
              onChange={setMerchantValues}
              disabled={submitting}
              logoPreviewUrl={logoPreviewUrl}
              logoInputId={logoInputId}
              onLogoChange={handleLogoChange}
            />
          ) : null}

          {error ? (
            <p className="text-center text-sm text-rose-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "保存中..." : "保存资料"}
          </button>
        </form>

        <div className="mt-6">
          <ChangePasswordSection />
        </div>
      </main>
    </div>
  );
}
