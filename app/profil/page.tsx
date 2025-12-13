"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { currentUser } from "@/utils/currentUser";

export default function ProfilPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const avatarSrc = useMemo(() => {
    return previewUrl || currentUser.avatarUrl || "/avatar-test.png";
  }, [previewUrl]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // preview local (plus tard: upload + save en DB)
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  return (
    <div className="cb-profile">
      <div className="cb-card cb-profile__card">
        <div className="cb-profile__top">
          <div>
            <h2 className="cb-dashboard__title">Mon profil</h2>
            <p className="cb-dashboard__subtitle">
              Avatar, infos et préférences.
            </p>
          </div>
        </div>

        <div className="cb-profile__identity">
          <div className="cb-profile__avatar">
            <Image
              className="cb-profile__avatar-img"
              src={avatarSrc}
              alt="Avatar utilisateur"
              width={72}
              height={72}
              priority
            />
          </div>

          <div className="cb-profile__meta">
            <div className="cb-profile__name">{currentUser.firstName}</div>
            <div className="cb-profile__sub">{currentUser.role}</div>
          </div>
        </div>

        <div className="cb-profile__section">
          <div className="cb-profile__label">Photo de profil</div>

          <div className="cb-profile__picker">
            <input
              className="cb-profile__file"
              type="file"
              accept="image/*"
              onChange={onPickFile}
            />
            <div className="cb-profile__hint">
              Pour l’instant c’est une prévisualisation locale. Plus tard on
              branchera l’upload + sauvegarde.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}