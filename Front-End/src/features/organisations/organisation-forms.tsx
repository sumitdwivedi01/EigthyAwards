"use client";

import { useState } from "react";
import { Controller, useForm, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon } from "lucide-react";
import { z } from "zod";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ME_KEY } from "@/features/auth/use-me";
import { ApiError, api } from "@/lib/api-client";
import type { IndianState, ListItem, Organisation, OrganisationResult } from "@/lib/api-types";
import { showApiErrors } from "@/lib/forms";

export const MY_ORGANISATIONS_KEY = ["organisations", "mine"] as const;

export function useMyOrganisations() {
  return useQuery({ queryKey: MY_ORGANISATIONS_KEY, queryFn: () => api.get<Organisation[]>("/organisations/mine") });
}

function useLists() {
  const states = useQuery({ queryKey: ["master-data", "states"], queryFn: () => api.get<IndianState[]>("/master-data/states"), staleTime: Infinity });
  const types = useQuery({
    queryKey: ["master-data", "organisation-types"],
    queryFn: () => api.get<ListItem[]>("/master-data/organisation-types"),
    staleTime: 5 * 60_000,
  });
  return { states: states.data ?? [], types: types.data ?? [] };
}

function useRefreshAfterSave() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: MY_ORGANISATIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: ME_KEY }),
    ]);
}

const NONE = "none";

// The profile as typed; the API normalises every value (one PAN, one spelling) and decides.
const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Enter the legal name."),
  gstin: z.string().trim(),
  addressLine: z.string().trim().min(1, "Enter the registered address."),
  city: z.string().trim().min(1, "Enter the city."),
  stateCode: z.string().min(1, "Pick the state."),
  pincode: z.string().trim().min(1, "Enter the PIN code."),
  officialEmail: z.string().trim().min(1, "Enter the official email."),
  phone: z.string().trim().min(1, "Enter a phone number."),
  orgTypeId: z.string(),
  cin: z.string().trim(),
  website: z.string().trim(),
});
type ProfileValues = z.infer<typeof profileSchema>;
const PROFILE_FIELDS = Object.keys(profileSchema.shape) as (keyof ProfileValues)[];

/** Register and Edit share one shape; when editing, the PAN is fixed and isn't sent. */
const organisationSchema = profileSchema.extend({ pan: z.string().trim().min(1, "Enter the PAN.") });
type OrganisationValues = z.infer<typeof organisationSchema>;

function toPayload(values: ProfileValues) {
  return {
    legalName: values.legalName,
    gstin: values.gstin || null,
    addressLine: values.addressLine,
    city: values.city,
    stateCode: values.stateCode,
    pincode: values.pincode,
    officialEmail: values.officialEmail,
    phone: values.phone,
    orgTypeId: values.orgTypeId && values.orgTypeId !== NONE ? values.orgTypeId : null,
    cin: values.cin || null,
    website: values.website || null,
  };
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertDescription>
        {warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

/** The profile fields shared by Register and Edit. */
function ProfileFields({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<OrganisationValues>;
  control: Control<OrganisationValues>;
  errors: FieldErrors<OrganisationValues>;
}) {
  const { states, types } = useLists();
  return (
    <>
      <FormField label="Legal name" hint="As on the PAN card or certificate of incorporation." error={errors.legalName?.message}>
        {(c) => <Input {...c} autoComplete="organization" {...register("legalName")} />}
      </FormField>
      <FormField label="GSTIN (optional)" hint="15 characters; it contains the PAN. Leave empty if there is none." error={errors.gstin?.message}>
        {(c) => <Input {...c} className="uppercase" {...register("gstin")} />}
      </FormField>
      <FormField label="Registered address" error={errors.addressLine?.message}>
        {(c) => <Input {...c} autoComplete="street-address" {...register("addressLine")} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" error={errors.city?.message}>
          {(c) => <Input {...c} autoComplete="address-level2" {...register("city")} />}
        </FormField>
        <FormField label="State" error={errors.stateCode?.message}>
          {(c) => (
            <Controller
              control={control}
              name="stateCode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} aria-describedby={c["aria-describedby"]} className="w-full">
                    <SelectValue placeholder="Pick a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <FormField label="PIN code" error={errors.pincode?.message}>
          {(c) => <Input {...c} inputMode="numeric" autoComplete="postal-code" {...register("pincode")} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Official email" hint="Formal letters about applications go here too." error={errors.officialEmail?.message}>
          {(c) => <Input {...c} type="email" {...register("officialEmail")} />}
        </FormField>
        <FormField label="Phone" error={errors.phone?.message}>
          {(c) => <Input {...c} type="tel" {...register("phone")} />}
        </FormField>
      </div>
      <FormField label="Organisation type (optional)" error={errors.orgTypeId?.message}>
        {(c) => (
          <Controller
            control={control}
            name="orgTypeId"
            render={({ field }) => (
              <Select value={field.value || NONE} onValueChange={field.onChange}>
                <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not specified</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="CIN (optional)" error={errors.cin?.message}>
          {(c) => <Input {...c} className="uppercase" {...register("cin")} />}
        </FormField>
        <FormField label="Website (optional)" error={errors.website?.message}>
          {(c) => <Input {...c} type="url" placeholder="https://" {...register("website")} />}
        </FormField>
      </div>
    </>
  );
}

const emptyProfile: ProfileValues = {
  legalName: "",
  gstin: "",
  addressLine: "",
  city: "",
  stateCode: "",
  pincode: "",
  officialEmail: "",
  phone: "",
  orgTypeId: "",
  cin: "",
  website: "",
};

/** Registers the organisation; the first person from a company does this once (§5.2). */
export function RegisterOrganisationForm({ onPanRegistered }: { onPanRegistered: (pan: string) => void }) {
  const refresh = useRefreshAfterSave();
  const [warnings, setWarnings] = useState<string[]>([]);
  const form = useForm<OrganisationValues>({ resolver: zodResolver(organisationSchema), defaultValues: { ...emptyProfile, pan: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: OrganisationValues) {
    try {
      const result = await api.post<OrganisationResult>("/organisations", { pan: values.pan, ...toPayload(values) });
      setWarnings(result.warnings);
      await refresh();
    } catch (error) {
      // One record per PAN: an existing organisation is joined, not registered again.
      if (error instanceof ApiError && error.reason === "PAN_REGISTERED") return onPanRegistered(values.pan);
      showApiErrors(error, form.setError, ["pan", ...PROFILE_FIELDS]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <Warnings warnings={warnings} />
      <FormField label="PAN" hint="5 letters, 4 digits, 1 letter (for example ABCDE1234F)." error={errors.pan?.message}>
        {(c) => <Input {...c} className="uppercase" {...form.register("pan")} />}
      </FormField>
      <ProfileFields register={form.register} control={form.control} errors={errors} />
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? "Registering…" : "Register organisation"}
      </Button>
    </form>
  );
}

const joinSchema = z.object({ pan: z.string().trim().min(1, "Enter the PAN."), gstin: z.string().trim(), officialEmail: z.string().trim() });
type JoinValues = z.infer<typeof joinSchema>;

/** Joins an organisation a colleague registered: PAN and GSTIN, or PAN and official email (§5.2). */
export function JoinOrganisationForm({ initialPan, notice }: { initialPan?: string; notice?: string }) {
  const refresh = useRefreshAfterSave();
  const [noGstin, setNoGstin] = useState(false);
  const form = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { pan: initialPan ?? "", gstin: "", officialEmail: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: JoinValues) {
    try {
      await api.post<OrganisationResult>(
        "/organisations/join",
        noGstin ? { pan: values.pan, officialEmail: values.officialEmail } : { pan: values.pan, gstin: values.gstin },
      );
      await refresh();
    } catch (error) {
      showApiErrors(error, form.setError, ["pan", "gstin", "officialEmail"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <FormError message={errors.root?.server?.message} />
      <FormField label="PAN" error={errors.pan?.message}>
        {(c) => <Input {...c} className="uppercase" {...form.register("pan")} />}
      </FormField>
      <div className="flex items-center gap-2">
        <Checkbox id="join-no-gstin" checked={noGstin} onCheckedChange={(value) => setNoGstin(value === true)} />
        <Label htmlFor="join-no-gstin" className="font-normal">
          The organisation has no GSTIN
        </Label>
      </div>
      {noGstin ? (
        <FormField label="Official email" hint="The organisation's official email address on record." error={errors.officialEmail?.message}>
          {(c) => <Input {...c} type="email" {...form.register("officialEmail")} />}
        </FormField>
      ) : (
        <FormField label="GSTIN" error={errors.gstin?.message}>
          {(c) => <Input {...c} className="uppercase" {...form.register("gstin")} />}
        </FormField>
      )}
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? "Joining…" : "Join organisation"}
      </Button>
    </form>
  );
}

function valuesOf(organisation: Organisation): OrganisationValues {
  return {
    pan: organisation.pan,
    legalName: organisation.legalName,
    gstin: organisation.gstin ?? "",
    addressLine: organisation.addressLine,
    city: organisation.city,
    stateCode: organisation.state.code,
    pincode: organisation.pincode,
    officialEmail: organisation.officialEmail,
    phone: organisation.phone,
    orgTypeId: organisation.organisationType?.id ?? "",
    cin: organisation.cin ?? "",
    website: organisation.website ?? "",
  };
}

/** A member edits the profile; the PAN stays (a wrong one is corrected by the leader). */
export function EditOrganisationForm({ organisation, onDone }: { organisation: Organisation; onDone: () => void }) {
  const refresh = useRefreshAfterSave();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<OrganisationValues>({ resolver: zodResolver(organisationSchema), defaultValues: valuesOf(organisation) });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: OrganisationValues) {
    setNotice(null);
    try {
      const result = await api.patch<OrganisationResult>(`/organisations/${organisation.id}`, toPayload(values));
      setWarnings(result.warnings);
      form.reset(valuesOf(result.organisation));
      setNotice("Saved.");
      await refresh();
    } catch (error) {
      showApiErrors(error, form.setError, PROFILE_FIELDS);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <Warnings warnings={warnings} />
      <FormField label="PAN" hint="The PAN identifies the organisation and can't be changed here.">
        {(c) => <Input {...c} value={organisation.pan} readOnly disabled />}
      </FormField>
      <ProfileFields register={form.register} control={form.control} errors={errors} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Close
        </Button>
        <FormNotice message={notice} />
      </div>
    </form>
  );
}
