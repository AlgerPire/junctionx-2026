"""Build data/esco_skills_subset.json (EN/FI/SV labels + synonyms) from fallback."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "data" / "esco_skills_fallback.json"
OUT = ROOT / "data" / "esco_skills_subset.json"

# Hand translations for demo/pilot subset. Unlisted labels keep EN for all locales.
FI: dict[str, str] = {
    "Python": "Python",
    "SQL": "SQL",
    "Data analysis": "Data-analyysi",
    "Data visualisation": "Datavisualisointi",
    "Machine learning basics": "Koneoppimisen perusteet",
    "Health data literacy": "Terveysdatan lukutaito",
    "Clinical documentation": "Kliininen dokumentointi",
    "Patient care coordination": "Hoidon koordinointi",
    "Medical terminology": "Lääketieteellinen terminologia",
    "JavaScript": "JavaScript",
    "TypeScript": "TypeScript",
    "React": "React",
    "HTML and CSS": "HTML ja CSS",
    "REST APIs": "REST-rajapinnat",
    "Backend development": "Backend-kehitys",
    "Frontend development": "Frontend-kehitys",
    "Cloud security": "Pilviturvallisuus",
    "Kubernetes": "Kubernetes",
    "Docker": "Docker",
    "CI/CD": "CI/CD",
    "Customer support": "Asiakastuki",
    "Ticket triage": "Tikettien priorisointi",
    "Customer success": "Asiakkuuksien hallinta",
    "Written communication": "Kirjallinen viestintä",
    "Verbal communication": "Suullinen viestintä",
    "Problem solving": "Ongelmanratkaisu",
    "Teamwork": "Tiimityö",
    "Project coordination": "Projektikoordinointi",
    "Teaching and facilitation": "Opetus ja fasilitointi",
    "Nursing practice": "Hoitotyö",
    "Hospital workflows": "Sairaalan työnkulut",
    "Logistics coordination": "Logistiikan koordinointi",
    "Inventory management": "Varastonhallinta",
    "Bookkeeping": "Kirjanpito",
    "Privacy awareness": "Tietosuojatietoisuus",
    "GDPR basics": "GDPR:n perusteet",
    "Finnish language (work)": "Suomen kieli (työ)",
    "Swedish language (work)": "Ruotsin kieli (työ)",
    "Accessibility awareness": "Saavutettavuustietoisuus",
    "Git version control": "Git-versionhallinta",
    "Identity and access management": "Identiteetin- ja pääsynhallinta",
}

SV: dict[str, str] = {
    "Python": "Python",
    "SQL": "SQL",
    "Data analysis": "Dataanalys",
    "Data visualisation": "Datavisualisering",
    "Machine learning basics": "Grundläggande maskininlärning",
    "Health data literacy": "Hälsodataförståelse",
    "Clinical documentation": "Klinisk dokumentation",
    "Patient care coordination": "Vårdkoordinering",
    "Medical terminology": "Medicinsk terminologi",
    "JavaScript": "JavaScript",
    "TypeScript": "TypeScript",
    "React": "React",
    "HTML and CSS": "HTML och CSS",
    "REST APIs": "REST-API:er",
    "Backend development": "Backend-utveckling",
    "Frontend development": "Frontend-utveckling",
    "Cloud security": "Molnsäkerhet",
    "Kubernetes": "Kubernetes",
    "Docker": "Docker",
    "CI/CD": "CI/CD",
    "Customer support": "Kundsupport",
    "Ticket triage": "Ärendeprioritering",
    "Customer success": "Customer success",
    "Written communication": "Skriftlig kommunikation",
    "Verbal communication": "Muntlig kommunikation",
    "Problem solving": "Problemlösning",
    "Teamwork": "Teamarbete",
    "Project coordination": "Projektkoordinering",
    "Teaching and facilitation": "Undervisning och facilitering",
    "Nursing practice": "Omvårdnad",
    "Hospital workflows": "Sjukhusarbetsflöden",
    "Logistics coordination": "Logistikkoordinering",
    "Inventory management": "Lagerhantering",
    "Bookkeeping": "Bokföring",
    "Privacy awareness": "Integritetsmedvetenhet",
    "GDPR basics": "GDPR-grunder",
    "Finnish language (work)": "Finska (arbete)",
    "Swedish language (work)": "Svenska (arbete)",
    "Accessibility awareness": "Tillgänglighetsmedvetenhet",
    "Git version control": "Git-versionshantering",
    "Identity and access management": "Identitets- och åtkomsthantering",
}

SYNONYMS: dict[str, list[tuple[str, str]]] = {
    "Data analysis": [("en", "analytics"), ("en", "data analytics"), ("fi", "analytiikka"), ("sv", "analys")],
    "React": [("en", "React.js"), ("en", "ReactJS")],
    "Customer support": [("en", "helpdesk"), ("en", "customer service"), ("fi", "asiakaspalvelu"), ("sv", "kundtjänst")],
    "Backend development": [("en", "server-side development"), ("fi", "palvelinpuolen kehitys")],
    "CI/CD": [("en", "continuous integration"), ("en", "continuous delivery")],
    "Docker": [("en", "containers"), ("en", "containerisation")],
    "Nursing practice": [("en", "nursing"), ("fi", "sairaanhoito"), ("sv", "sjuksköterska")],
    "SQL": [("en", "structured query language"), ("en", "relational queries")],
    "Python": [("en", "python programming"), ("fi", "python-ohjelmointi")],
}


def main() -> None:
    rows = json.loads(SRC.read_text(encoding="utf-8"))
    out = []
    for i, row in enumerate(rows):
        label = row["label"]
        uri = row.get("esco_uri") or f"https://data.europa.eu/esco/skill/local-{i+1:04d}"
        out.append(
            {
                "esco_uri": uri,
                "label": label,
                "labels": {
                    "en": label,
                    "fi": FI.get(label, label),
                    "sv": SV.get(label, label),
                },
                "description": row.get("description") or "",
                "cluster": row.get("cluster") or "transversal",
                "synonyms": [{"lang": lang, "synonym": syn} for lang, syn in SYNONYMS.get(label, [])],
            }
        )
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(out)} skills to {OUT}")


if __name__ == "__main__":
    main()
