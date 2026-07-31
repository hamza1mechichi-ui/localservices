import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORIES = [
  "Électricité",
  "Plomberie",
  "Climatisation",
  "Rénovation",
  "Peinture",
  "Menuiserie",
  "Serrurerie",
  "Jardinage",
  "Ménage",
  "Autre",
];

export const CATEGORIES_AR = [
  "كهربا",
  "سباكة",
  "تكييف",
  "ترميم",
  "دهان",
  "نجارة",
  "سراجة",
  "بستانة",
  "تنظيف",
  "آخر",
];

export const TUNISIAN_CITIES = [
  "Tunis",
  "Sfax",
  "Sousse",
  "Ettadhamen",
  "Kairouan",
  "Bizerte",
  "Gabès",
  "Ariana",
  "Gafsa",
  "Monastir",
  "Ben Arous",
  "Médenine",
  "Nabeul",
  "Tataouine",
  "Béja",
  "Jendouba",
  "El Kef",
  "Siliana",
  "Kasserine",
  "Tozeur",
  "Kebili",
  "Zaghouan",
  "Mahdia",
  "Sidi Bouzid",
];

export const TUNISIAN_CITIES_AR = [
  "تونس",
  "صفاقس",
  "سوسة",
  "التضامن",
  "القيروان",
  "بنزرت",
  "قابس",
  "أريانة",
  "قفصة",
  "المنستير",
  "بن عروس",
  "مدنين",
  "نابل",
  "تطاوين",
  "باجة",
  "جندوبة",
  "الكاف",
  "سليانة",
  "القصرين",
  "توزر",
  "قبلي",
  "زغوان",
  "المهدية",
  "سيدي بوزيد",
];

export const PHONE_REGEX = /^[0-9]{8}$/;

export function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `+216 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function formatPrice(amount: number, lang: "fr" | "ar-tn" = "fr") {
  const formatted = amount.toLocaleString(lang === "ar-tn" ? "ar-TN" : "fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  if (lang === "ar-tn") {
    return `${formatted} د.ت`;
  }
  return `${formatted} DT`;
}
