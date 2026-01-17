export type Profile = {
  id: string;

  username: string;
  display_name: string;

  profile_image_url: string | null;
  bio: string | null;

  is_private: boolean;
  onboarding_completed: boolean;

  has_accepted_privacy_policy: boolean;
  privacy_accepted_at: string | null;

  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;

  country: string | null;
  state: string | null;
  city: string | null;

  date_of_birth: string | null; // PostgREST returns date as string (YYYY-MM-DD)

  height_cm: string | null; // numeric often comes back as string via PostgREST
  weight_kg: string | null;

  gender: string | null;
  app_usage_reasons: string[];

  fitness_journey_stage: string | null;

  created_at: string;
  updated_at: string;

  profile_row_id: string | null;
};

export type ProfilePreview = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'profile_image_url' | 'bio' | 'is_private'
>;

export type UpdateMyProfileInput = Partial<
  Pick<
    Profile,
    | 'first_name'
    | 'last_name'
    | 'preferred_name'
    | 'username'
    | 'display_name'
    | 'bio'
    | 'profile_image_url'
    | 'is_private'
    | 'country'
    | 'state'
    | 'city'
    | 'date_of_birth'
    | 'height_cm'
    | 'weight_kg'
    | 'gender'
    | 'app_usage_reasons'
    | 'fitness_journey_stage'
  >
>;
