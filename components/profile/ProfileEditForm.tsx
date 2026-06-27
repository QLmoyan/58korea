"use client";

import { PROFILE_GENDERS } from "@/lib/profile/constants";

export interface ProfileEditFormValues {
  nickname: string;
  bio: string;
  gender: string;
  city: string;
}

interface ProfileEditFormProps {
  values: ProfileEditFormValues;
  onChange: (values: ProfileEditFormValues) => void;
  disabled?: boolean;
}

export default function ProfileEditForm({
  values,
  onChange,
  disabled = false,
}: ProfileEditFormProps) {
  function updateField<K extends keyof ProfileEditFormValues>(
    key: K,
    value: ProfileEditFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <h2 className="text-sm font-semibold text-zinc-900">基本资料</h2>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">昵称</label>
        <input
          value={values.nickname}
          disabled={disabled}
          onChange={(event) => updateField("nickname", event.target.value)}
          placeholder="请输入昵称"
          className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">简介</label>
        <textarea
          value={values.bio}
          disabled={disabled}
          onChange={(event) => updateField("bio", event.target.value)}
          placeholder="介绍一下自己"
          rows={4}
          className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            性别（可选）
          </label>
          <select
            value={values.gender}
            disabled={disabled}
            onChange={(event) => updateField("gender", event.target.value)}
            className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-rose-300 disabled:opacity-60"
          >
            <option value="">不填写</option>
            {PROFILE_GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            所在城市（可选）
          </label>
          <input
            value={values.city}
            disabled={disabled}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="例如：首尔"
            className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
          />
        </div>
      </div>
    </section>
  );
}

export type { ProfileEditFormValues as ProfileEditFormState };
