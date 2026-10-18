#!/usr/bin/env python3
"""Ingest the YGIA professional presentation booklet into knowledge.json."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / "data" / "ygia-pro-presentation-clean.txt"
STORE = ROOT / "data" / "knowledge.json"
FAQ_TAG = "pro-booklet-2023"

# Anchor names as they appear in the cleaned extract (order matters).
PRODUCTS: list[tuple[str, str, list[str]]] = [
    # (canonical_name, shopify_handle_or_empty, alternate_anchors)
    ("Curcumin 95%", "curcumin-95-pepper", ["Curcumin 95%"]),
    ("Prostate Support", "super-prostate-support-600-mg-std", ["Prostate Support"]),
    ("Daily Male", "daily-male", ["Daily Male"]),
    ("Daily Lady", "daily-lady-1", ["Daily Lady"]),
    ("Anxi FREE", "stress-free", ["Anxi FREE", "Anxi Free"]),
    ("Milk Thistle", "milk-thistle", ["Milk Thistle"]),
    ("Relive", "relive", ["Relive"]),
    ("Vitamin D3 1000 IU with Vitamin C", "", ["Vit D3, 1000 i.u. with Vit C"]),
    ("Vitamin D3 5000 IU with Vitamin C", "", ["Vit D3, 5000 i.u. with Vit C"]),
    ("Magnesium Glycinate", "magnesium-glycinate", ["Magnesium Glycinate"]),
    ("Zinc Picolinate 75 mg & Vitamin C", "picoline-zinc-75-mg-vitamin-c", ["Picoline Zinc 75 mg & Vit C"]),
    ("Red Yeast Rice", "red-yeast-rice", ["RED YEAST RICE"]),
    ("Lion's Mane Mushroom", "lions-mane-mushroom-a-tonic-for-the-nervous-system", ["LION'S MANE MUSHROOM"]),
    ("Super Lax Support", "super-lax", ["SUPER LAX SUPPORT"]),
    ("Chaga Mushroom", "chaga-mushroom-ygia", ["CHAGA MUSHROOM"]),
    ("Ginkgo Biloba", "gingo-biloba", ["Ginkgo Biloba"]),
    ("Olive Leaf Extract", "olive-leaf-20-oleuropein", ["Olive Leaf Extract"]),
    ("Memory Support", "memory-support-ygia", ["Memory Support"]),
    ("Breathe Easy", "breathe-easy", ["Breathe Easy"]),
    ("Echinacea", "echinacea-ygia", ["Echinacea"]),
    ("Cordyceps Sinensis", "pure-cordyceps-sinensis", ["Cordyceps Sinensis"]),
    ("Red Reishi", "red-reishi-ganoderma-mushroom-1", ["Red Reishi- Γανόδερμα", "Red Reishi"]),
    ("3 Days Slim", "3-days-slim", ["3 Days Slim"]),
    ("Rock Rose", "rock-rose", ["Rock Rose"]),
    ("Tribulus Terrestris", "pure-tribulus-terrestris", ["Tribulus Terrestris"]),
    ("Sharp Mind", "sharpmind", ["Sharp Mind"]),
    ("Vitamin C", "vitamin-c", ["Vitamin C"]),
]

# Longest-first Greek → English phrase map for booklet language.
PHRASES: list[tuple[str, str]] = [
    ("100% ΦΥΣΙΚΑ ΣΥΜΠΛΗΡΩΜΑΤΑ ΜΕ ΒΟΤΑΝΑ ΥΨΗΛΗΣ ΔΥΝΑΜΙΚΗΣ", "100% natural supplements with high-potency herbs"),
    ("ΧΩΡΙΣ ΠΡΟΣΘΕΤΑ ΣΕ ΦΥΤΙΚΕΣ ΚΑΨΟΥΛΕΣ", "no additives, in plant capsules"),
    ("ΣΕ ΓΥΑΛΙΝΑ ΦΙΜΕ ΜΠΟΥΚΑΛΙΑ - ΚΑΤΑΛΛΗΛΑ ΓΙΑ VEGANS", "in amber glass bottles — suitable for vegans"),
    ("ΕΝΗΜΕΡΩΤΙΚΟ ΓΙΑ ΕΠΑΓΓΕΛΜΑΤΙΕΣ ΥΓΕΙΑΣ", "information booklet for health professionals"),
    ("100% ΠΟΙΟΤΗΤΑ ΣΕ ΟΛΑ TA ΕΠΙΠΕΔΑ", "100% quality at every level"),
    ("ΒΟΤΑΝΑ ΥΨΗΛΗΣ ΔΥΝΑΜΙΚΗΣ", "High-potency herbs"),
    ("ΕΠΑΝΑΣΤΑΤΙΚΕΣ ΟΙΚΟΛΟΓΙΚΕΣ , ΚΑΨΟΥΛΕΣ", "Next-generation ecological capsules"),
    ("ΑΝΑΚΥΚΛΩΣΗ ΑΣΦΑΛΗ ΣΥΣΚΕΥΑΣΙΑ ΓΙΑ ΤΟΝ ΚΑΤΑΝΑΛΩΤΗ", "Safe recyclable packaging for the consumer"),
    ("Όλα τα συμπληρώματα μας είναι 100% φυσικά , χωρίς κανένα πρόσθετο", "All our supplements are 100% natural, with no additives"),
    ("Είναι μη μεταλλαγμένα και απαλλαγμένααπό όλα τα αλλεργιογόνα", "They are non-GMO and free from all allergens"),
    ("χωρίς γλουτένη , χωρίς γαλακτοκομικά , χωρίς σόγια και χωρίς τεχνητά χρώματα , γεύσειςκαι γλυκαντικά", "gluten-free, dairy-free, soy-free, and free from artificial colors, flavors and sweeteners"),
    ("Αυτά τα προϊόντα είναι 100% κατάλληλα για χορτοφάγους και vegans", "These products are 100% suitable for vegetarians and vegans"),
    ("Παράγονται σεεγκατάστασεις πιστοποιημένες από το Υπουργείο Υγείας", "They are produced in facilities certified by the Ministry of Health"),
    ("που συσκευάζονται κάτω από αυστηρές προδιαγραφές υγιεινής στο εγκεκριμένο εργαστήριομας", "packaged under strict hygiene standards in our approved laboratory"),
    ("και περιέχουν 100% από τα καλύτερης ποιότητας και δυναμικής εκχυλίσματα βοτάνων από αξιόπιστουςπρομηθευτές από όλο τον κόσμο", "and contain 100% of the best quality and potency herbal extracts from trusted suppliers worldwide"),
    ("χωρίς πρόσθετα , σε φυτοφαγικές κάψουλες", "with no additives, in vegan capsules"),
    ("Τα προϊόντα μας είναι βασισμένα σεΠανεπιστημιακές έρευνες , στην Παραδοσιακή και Ολιστική Ιατρική και σε βαθιά γνώση των ιδιοτήτων τωνβοτάνων που χρησιμοποιούμε", "Our products are based on university research, traditional and holistic medicine, and deep knowledge of the herbs we use"),
    ("Το Pullulan είναι η επόμενη γενιά κάψουλων , που προέρχεται από ρίζα ταπιόκα επεξεργασμένη με νερό", "Pullulan is the next generation of capsules, from tapioca root processed with water"),
    ("Πολλάσυμπληρώματα χρησιμοποιούν κάψουλες που παρασκευάζονται από φυτική κυτταρίνη , η οποία υποβάλλεται σεβαριά επεξεργασία και παράγει μη φιλικά προς το περιβάλλον , επιβλαβή προϊόντα", "Many supplements use capsules made from plant cellulose that undergoes heavy processing and produces environmentally unfriendly byproducts"),
    ("Χρησιμοποιούμε 100% ανακυκλώσιμα γυάλινα φιμέ μπουκάλια που προστατεύουν τα συμπληρώματα από το φωςκαι τη θερμοκρασία και κανένα επιβλαβές χημικό δεν μπορεί να διεισδύσει στο προϊόν", "We use 100% recyclable amber glass bottles that protect supplements from light and heat, and no harmful chemicals can leach into the product"),
    ("Aποτελεσματική κατά των φλεγμονών (είναι αποτελεσματική όσο η κορτιζόνη και η φαινυλβουταζόνη , ακόμη και σε χρόνια φλεγμονή )", "Effective against inflammation (as effective as cortisone and phenylbutazone, even in chronic inflammation)"),
    ("Μειώνει τις φλεγμονές και τους πόνους", "Reduces inflammation and pain"),
    ("Αποτελεσματική στην αρθρίτιδα . Συμβάλλει στην υγεία των αρθρώσεων και των μυών", "Effective for arthritis. Supports joint and muscle health"),
    ("συμβάλλει στην καλύτερη λειτουργία του εγκεφάλου . Μειώνει τα συμπτώματα κατάθλιψης", "Supports better brain function. Helps reduce depression symptoms"),
    ("συμβάλλει στην βελτίωση της πέψης", "Supports improved digestion"),
    ("συμβάλλει στη μείωση της χοληστερόλης", "Supports lowering cholesterol"),
    ("συμβάλλει στην ρύθμιση του σακχάρου στο αίμα", "Supports blood sugar regulation"),
    ("Επιβραδύνει ή αποτρέπει θρόμβους αίματος", "Helps slow or prevent blood clots"),
    ("32 ΦΟΡΕΣ ΠΙΟ ΔΥΝΑΤΗ ΑΠΟ ΤΟ ΚΟΙΝΟ ΜΠΑΧΑΡΙΚΟ", "32 times stronger than common turmeric spice"),
    ("Αποτοξινώνει τον προστάτη και το ουροποιητικό", "Supports detox of the prostate and urinary tract"),
    ("Συμβάλλει στην μείωση της φλεγμονής και της υπερπλασίας", "Supports reducing inflammation and hyperplasia"),
    ("Ρυθμίζει τις ορμόνες", "Helps regulate hormones"),
    ("ΙΣΩΣ ΤΟ ΑΠΟΤΕΛΕΣΜΑΤΙΚΟΤΕΡΟ ΣΥΜΠΛΗΡΩΜΑ ΓΙΑ ΤΟΝ ΠΡΟΣΤΑΤΗ", "Perhaps the most effective prostate supplement"),
    ("H μοναδικότητα του Prostate Support βρίσκεται στην συνεργιστική στοχευμένη δράση τριών βοτάνων", "Prostate Support’s uniqueness is the synergistic targeted action of three herbs"),
    ("Βοηθά στην αύξηση της ερωτικής διάθεσης , της δράσης και στην ποιότητα της στύσης", "Helps increase sexual desire, performance, and erection quality"),
    ("Βοηθά στην αύξηση της της καλής τεστοστερόνης , της ενέργειας και στην ενδυνάμωση των μυών", "Helps increase healthy testosterone, energy, and muscle strength"),
    ("Βοηθά στην αύξηση της ενέργειας", "Helps increase energy"),
    ("Βοηθά στην αύξηση της καλής τεστοστερόνης", "Helps increase healthy testosterone"),
    ("Βοηθά στην ενδυνάμωση των μυών", "Helps strengthen muscles"),
    ("Συμβάλλει στην ενίσχυση και αποτοξίνωση του οργανισμού", "Supports strengthening and detoxifying the body"),
    ("Αύξηση ερωτικής διάθεσης για γυναίκες", "Supports increased sexual desire for women"),
    ("Αντιγηραντικό", "Anti-aging support"),
    ("Ρύθμιση γυναικείων ορμονών , έμμηνου ρήσης και εμμηνόπαυσης", "Supports regulation of female hormones, menstrual cycle, and menopause"),
    ("Συμβάλλει στην αύξηση της ενέργειας", "Supports increased energy"),
    ("Συμβάλλει στην αύξηση της καλής τεστοστερόνης", "Supports healthy testosterone levels"),
    ("Συμβάλλει στην άμεση διαχείριση του άγχους", "Supports immediate stress management"),
    ("Επαναφέρει την ηρεμία του μυαλού", "Helps restore calm of mind"),
    ("Ενδυναμώνει το νευρικό σύστημα", "Strengthens the nervous system"),
    ("Μειώνει τις κρίσεις πανικού , τις φοβίες και τις ανασφάλειες", "Helps reduce panic attacks, fears, and insecurities"),
    ("Βελτιώνει την ηπατική λειτουργία", "Improves liver function"),
    ("Η καλύτερη επιλογή για αποτοξίνωση του συκωτιού και του αίματος", "A top choice for liver and blood detox support"),
    ("Ρυθμίζει αποτελεσματικά τον μεταβολισμό βοηθώντας στην απώλεια βάρους", "Effectively supports metabolism and weight management"),
    ("Παρέχει μια φυσική λάμψη στην επιδερμίδα", "Supports a natural glow to the skin"),
    ("Βοηθά στην ανακούφιση από δυσπεψία και πονοκέφαλους", "Helps relieve indigestion and headaches"),
    ("Βοηθά σημαντικά στη μείωση οργανικών βλαβών απο αλκοόλ", "Helps reduce organic damage from alcohol"),
    ("Συμβάλλει στην σημαντική μείωση του σακχάρου στο αίμα", "Supports significant reduction of blood sugar"),
    ("Συμβάλλει στην σημαντική μείωση της ολικής χοληστερόλης", "Supports significant reduction of total cholesterol"),
    ("Βοηθά στην ανακούφιση και στο πρήξιμο των αιμορροΐδων", "Helps relieve hemorrhoid discomfort and swelling"),
    ("Ήπιο αντικαταλθιπτικό", "Gentle mood support (mild antidepressant-style effect)"),
    ("Μειώνει την στεναχώρια", "Helps reduce sadness / low mood"),
    ("Επαναφέρει την χαρά και την όρεξη για ζωή", "Helps restore joy and zest for life"),
    ("Επαναφέρει την ηρεμία", "Helps restore calm"),
    ("Τονώνει το νευρικό σύστημα", "Tones the nervous system"),
    ("Συμβάλλει στην ενδυνάμωση των οστών", "Supports bone strength"),
    ("Συμβάλλει στην παραγωγή κολλαγόνου", "Supports collagen production"),
    ("Βελτιώνει την διάθεση και προσδίδει ενέργεια", "Improves mood and provides energy"),
    ("Συμβλάλλει στην ενδυνάμωση των μυών", "Supports muscle strength"),
    ("Διαθέτει αντικαρκινική δράση", "Has researched anti-cancer supportive properties"),
    ("Η βιταμίνη D είναι πολύ σημαντική για την απορρόφηση του ασβεστίου και του φωσφόρου , διασφαλίζοντας έτσι την καλή υγεία των οστών , ενώ η έλλειψή της έχει συσχετιστεί με την εμφάνιση αυτοάνοσων νοσημάτων , καρκίνου και καρδιοπαθειών", "Vitamin D is very important for calcium and phosphorus absorption and bone health; deficiency has been linked with autoimmune disease, cancer, and heart disease"),
    ("Στην διατήρηση φυσιολογικού καρδιακού ρυθμού", "Supports normal heart rhythm"),
    ("Στην ανακ ούφιση από το άγχος", "Supports relief from stress"),
    ("Προάγ ει την υγεία των οστών", "Promotes bone health"),
    ("Μείωση των συμπτωμάτων του προεμμηνορροϊκού συνδρόμου (PMS)", "Helps reduce PMS symptoms"),
    ("τη φυσιολογική λειτουργία των μυών και των νεύρων", "Supports normal muscle and nerve function"),
    ("στην άμυνα του οργανισμού", "Supports the body’s defenses"),
    ("στην οστική υγεία", "Supports bone health"),
    ("να ρυθμιστούν τα επίπεδα σακχάρου του αίματος", "Helps regulate blood sugar levels"),
    ("προωθεί την κανονική πίεση αίματος", "Supports normal blood pressure"),
    ("συμμετέχει στον ενεργειακό μεταβολισμό και στη σύνθεση των πρωτεϊνών", "Participates in energy metabolism and protein synthesis"),
    ("Το γλυκινικό μαγνήσιο μπορεί να βοηθήσει", "Magnesium glycinate can help with"),
    ("Κατέχει ενεργό ρόλο στην άμυνα του οργανισμού", "Plays an active role in immune defense"),
    ("Συμβάλλει στη φυσιολογική ψυχολογική λειτουργία", "Supports normal psychological function"),
    ("Συμβάλλει στη γονιμότητα και την αναπαραγωγή", "Supports fertility and reproduction"),
    ("Συμβάλλει στον φυσιολογικό μεταβολισμό της βιταμίνης Α", "Supports normal vitamin A metabolism"),
    ("Συμβάλλει στην υγεία του δέρματος , των μαλλιών και των οστών", "Supports skin, hair, and bone health"),
    ("Συμβάλλει στη διατήρηση των φυσιολογικών επιπέδων τεστοστερόνης στο αίμα , και στη διατήρηση της φυσιολογικής όρασης", "Supports normal testosterone levels and normal vision"),
    ("Ο πικολινικός ψευδάργυρος είναι μια όξινη μορφή ψευδαργύρου που το ανθρώπινο σώμα μπορεί να απορροφήσει πιο εύκολα από άλλες μορφές ψευδαργύρου", "Zinc picolinate is a form of zinc the body can absorb more easily than many other forms"),
    ("Ο ψευδάργυρος αποτελεί ένα από τα πιο σημαντικά μέταλλα του οργανισμού και είναι ένα από τα 24 μικροθρεπτικά συστατικά που χρειάζονται για την επιβίωση", "Zinc is one of the body’s most important minerals and one of 24 micronutrients needed for survival"),
    ("Συμβάλλει στη μείωση της χοληστερόλης ( ολική και LDL), στο συκώτι", "Supports lowering cholesterol (total and LDL) in the liver"),
    ("Συμβάλλει στη μείωση των τριγλυκερίδιων και μειώνει το καρδιαγγειακό κινδύνο", "Supports lowering triglycerides and cardiovascular risk"),
    ("Έχει αντιφλεγμονώδεις ιδιότητες , οι οποίες αποδίδονται στην συνεργική δράση των επιπρόσθετων ενεργών συστατικών του , όπως είναι οι στερόλες , οι ισοφλαβόνες και τα μονοακόρεστα λιπαρά οξέα", "Has anti-inflammatory properties from synergistic sterols, isoflavones, and monounsaturated fatty acids"),
    ("Η μαγιά κόκκινου ρυζιού (Red Yeast Rice) έχει παρόμοια δράση με τις στατίνες και η λήψη της μειώνει σημαντικά τον καρδιαγγειακό κίνδυνο . Είναι φυτική και φαίνεται να είναι καλύτερα ανεκτή σε σύγκριση με τις στατίνες", "Red Yeast Rice has a statin-like action and can significantly lower cardiovascular risk. It is plant-based and often better tolerated than statins"),
    ("Διεγείρει την ανάπτυξη των εγκεφαλικών κυττάρων", "Stimulates growth of brain cells"),
    ("Προστατευτικό εγκεφάλου", "Brain-protective"),
    ("Επιταχύνει την ανάρρωση από τραυματισμούς του νευρικού συστήματος", "Supports faster recovery from nervous-system injuries"),
    ("Προστατεύει το πεπτικό σύστημα από έλκος", "Helps protect the digestive system from ulcers"),
    ("Ενισχύει την καλή λειτουργία του εγκεφάλου , την επούλωση και αναγέννηση του νευρικού ιστού , τη βελτίωση της γνωστικής λειτουργίας και του μυϊκού συντονισμού", "Supports brain function, healing and regeneration of nerve tissue, cognition, and muscle coordination"),
    ("Στην παραδοσιακή Κινεζική ιατρική , έχει χρησιμοποιηθεί για τη θεραπεία διαταραχών του πεπτικού , του γαστρεντερικού και του ανοσοποιητικού συστήματος", "In traditional Chinese medicine it has been used for digestive, gastrointestinal, and immune disorders"),
    ("Προστατεύει την εντερική επένδυση σε όλο το πεπτικό σύστημα και βελτιώνει τη βιοδιαθεσιμότητα της απορρόφησης θρεπτικών συστατικών", "Protects the intestinal lining throughout the digestive tract and supports nutrient absorption"),
    ("Λειτουργεί ως καθαρτικό , επαναφέροντας την ομαλή λειτουργία του εντέρου με εντελώς φυσικό τρόπο", "Works as a natural laxative, restoring smooth bowel function"),
    ("Συμβάλλει στη δημιουργία χαλαρών κενώσεων", "Supports softer, easier bowel movements"),
    ("Συμβάλλει στην καταπολέμηση των μολύνσεων και των φλεγμονών στο έντερο", "Supports fighting infections and inflammation in the gut"),
    ("Η χρήση SUPER LAX SUPPORT για αντιμετώπιση της δυσκοιλιότητας θα πρέπει να γίνεται για διάστημα , έως 10 ημέρες", "Use Super Lax Support for constipation for up to 10 days"),
    ("Καταπολεμά τους ιούς και τους μύκητες", "Helps fight viruses and fungi"),
    ("Διεγείρει το κεντρικό νευρικό σύστημα", "Stimulates the central nervous system"),
    ("Καθυστερεί την ανάπτυξη όγκων και καρκινικών κυττάρων", "May slow growth of tumors and cancer cells"),
    ("Μειώνει την αρτηριακή πίεση και τα επίπεδα σακχάρου", "Supports lowering blood pressure and blood sugar"),
    ("Βελτιώνει την ελαστικότητα του δέρματος", "Improves skin elasticity"),
    ("Αποτοξινώνει του ήπαρ , τους νεφρούς και τη σπλήνα", "Supports detox of liver, kidneys, and spleen"),
    ("Τονώνει το ανοσοποιητικό σύστημα", "Tones the immune system"),
    ("Για την αντικαρκινική του δράση έχει εγκριθεί για χρήση κατά του καρκίνου από την Ιατρική Ακαδημία Επιστημών της Μόσχας το 1955", "For its anti-cancer supportive use it was approved by the Moscow Medical Academy of Sciences in 1955"),
    ("Η αντικαρκινική του δράση οφείλεται στην περιεκτικότητά του σε βήτα - γλυκάνες και μελανίνη , αλλά και στα αντικαρκινικά συστατικά βετουλίνη , βετουλινικό οξύ , λουπεόλη και τριτερπένια", "Its supportive anti-cancer activity is linked to beta-glucans, melanin, betulin, betulinic acid, lupeol, and triterpenes"),
    ("Το Chaga περιέχει πολυάριθμες βιταμίνες Β , φλαβονοειδή , φαινόλες , ανόργανα άλατα και ένζυμα", "Chaga contains numerous B vitamins, flavonoids, phenols, minerals, and enzymes"),
    ("Είναι μια από τις πυκνότερες πηγές σε παντοθενικό οξύ ( βιταμίνη Β 5), βιταμίνη που είναι απαραίτητη στα επινεφρίδια και τα πεπτικά όργανα", "It is one of the densest sources of pantothenic acid (vitamin B5), important for adrenals and digestive organs"),
    ("Διευρύνει τα αγγεία , βελτιώνει τη λειτουργία του εγκεφάλου και τον μεταβολισμό", "Dilates blood vessels; supports brain function and metabolism"),
    ("Ενισχύει την συγκέντρωση και την μειωμένη μνήμη και ενισχύει την εγκεφαλική λειτουργία", "Supports concentration, memory, and brain function"),
    ("Εμποδίζει την αρτηριοσκλήρυνση και μειώνει τον κίνδυνο εμφράγματος", "Helps resist arteriosclerosis and lower heart-attack risk"),
    ("Βοηθά να διατηρούνται ζεστά χέρια και πόδια", "Helps keep hands and feet warm"),
    ("Ανακουφίζει από πονοκεφάλους λόγω κακής κυκλοφορίας", "Relieves headaches from poor circulation"),
    ("Ισχυρό αντιοξειδωτικό βότανο με ιδιαίτερες ιδιότητες στο κυκλοφορικό και ειδικά στον εγκέφαλο", "A strong antioxidant herb with special benefits for circulation, especially the brain"),
    ("Συμβάλλει ως φυσικό αντιβιοτικό , αντιμικροβιακό , αντιμυκητιακό - Ισχυρό κατά των ιώσεων", "Acts as a natural antibiotic, antimicrobial, antifungal — strong against viral infections"),
    ("Βοηθά στη ρύθμιση της χοληστερόλης στο αίμα", "Helps regulate blood cholesterol"),
    ("Συμβάλλει ως αγγειοδιασταλτικό και υποτασικό", "Supports vasodilation and blood-pressure balance"),
    ("Βοηθά στην καταπολέμηση των αλλεργιών", "Helps fight allergies"),
    ("Συμβάλλει στην ενίσχυση του ανοσοποιητικού συστήματος", "Supports immune system strength"),
    ("Βοηθά στην αντιμετώπιση ουρολογικών προβλημάτων", "Helps with urinary tract issues"),
    ("Συμβάλλει στην ενίσχυση της μνήμης και της καλής λειτουργίας του εγκεφάλου", "Supports memory and healthy brain function"),
    ("Συμβάλλει στην ενίσχυση των επιπέδων ενέργειας", "Supports energy levels"),
    ("Βοηθά στην αύξηση της συγκέντρωσης και της εστίασης", "Helps increase concentration and focus"),
    ("Βοηθά στην ενδυνάμωση του νευρικού συστήματος", "Helps strengthen the nervous system"),
    ("Προστατεύει τα κύτταρα από το οξειδωτικό στρες", "Protects cells from oxidative stress"),
    ("Ενδυναμώνει την αναπνευστική λειτουργία", "Strengthens respiratory function"),
    ("Συμβάλλει στην αντιμετώπιση του άσθματος και της δύσπνοιας", "Supports management of asthma and shortness of breath"),
    ("Ενισχύει την οξυγόνωση του οργανισμού την ενδυνάμωση των πνευμόνων", "Supports oxygenation and lung strength"),
    ("ενισχύει την απόδοση στο γυμναστήριο", "Supports gym / training performance"),
    ("ενισχύει την ενέργεια", "Supports energy"),
    ("Ενισχύει την άμυνα του οργανισμού έναντι των λοιμώξεων του αναπνευστικού ( γρίπη , κρυολόγημα )", "Strengthens defense against respiratory infections (flu, colds)"),
    ("Ενισχύει το ανοσοποιητικό σύστημα", "Strengthens the immune system"),
    ("Αποτοξινώνει και τονώνει το λεμφικό σύστημα", "Supports detox and tone of the lymphatic system"),
    ("Διαθέτει επίσης αντιβιοτικές , αντιβακτηριακές , αντιφλεγμονώδεις και διεγερτικές ιδιότητες", "Also has antibiotic, antibacterial, anti-inflammatory, and stimulating properties"),
    ("Βελτιώνει την πρόσληψη οξυγόνου από το αίμα", "Improves oxygen uptake by the blood"),
    ("Βελτίωνει την λειτουργία της καρδιάς", "Improves heart function"),
    ("Συμβάλλει στην διατήρηση της υγιούς χοληστερόλης", "Supports healthy cholesterol"),
    ("Καταπολεμά λοιμώξεις του αναπνευστικού", "Helps fight respiratory infections"),
    ("Βελτίωση των χρόνιων παθήσεων των νεφρών", "Supports chronic kidney conditions"),
    ("Ενισχύει την λειτουργία του ανοσοποιητικού και έχει αντιγηραντική δράση", "Supports immune function and has anti-aging properties"),
    ("Βελτιώνει την σωματική αντοχή και την αθλητική απόδοση", "Improves physical stamina and athletic performance"),
    ("Λειτουργεί ως φυσικό αφροδισιακό", "Acts as a natural aphrodisiac"),
    ("Μείωνει την κούραση", "Reduces fatigue"),
    ("Συμβάλλει στη μείωση του επιπέδου χοληστερόλης και της στεφανιαίας ανεπάρκειας", "Supports lowering cholesterol and coronary insufficiency"),
    ("Συμβάλλει στη μείωση της υπέρτασης και βελτιώνει το νευρικό σύστημα , των νευρώσεων & της αϋπνίας", "Supports lowering hypertension and improving the nervous system, neuroses, and insomnia"),
    ("Συμβάλλει στη μείωση των συμπτωμάτων της χρόνιας βρογχίτιδας", "Supports reducing chronic bronchitis symptoms"),
    ("Συμβάλλει στη καλύτερη λειτουργία του συκωτιού αποτοξινώνοντας το", "Supports better liver function and detox"),
    ("Συμβάλλει στη βελτίωση της λειτουργίας των νεφρών", "Supports improved kidney function"),
    ("Διαθέτει αντιισταμινικές & αντιαλλεργικές ιδιότητες", "Has antihistamine and anti-allergy properties"),
    ("Συμβάλλει στη εξισορρόπηση των επιπέδων γλυκόζης στο αίμα", "Supports balancing blood glucose"),
    ("Το συμπλήρωμα 3 Days Slim μειώνει την όρεξη και συμβάλλει στην εφαρμογή της προτεινόμενης δίαιτας που βασίζεται στην δίαιτα μέρα παρά μέρα , γνωστή και ως διαλειμματική νηστεία", "3 Days Slim reduces appetite and supports the every-other-day / intermittent fasting style diet in the guide"),
    ("Με βαση το βιβιαράκι - οδηγό , το οποίο περιέχει συνταγές για γεύματα , σμούθις , σαλάτες με θερμίδες , εφαρμόζετε την επιστημονικά αποδεδειγμένη δίαιτα 3 μέρες της εβδομάδας (μέρα παρά μέρα ) ακολουθείτε συγκεκριμένο πρόγραμμα βάση οδηγού διατροφής και 4 μέρες τρώτε ότι σας αρέσει", "With the guide booklet (meals, smoothies, salads with calories), follow the every-other-day plan 3 days a week and eat freely the other 4 days"),
    ("ΔΩΡΟ : ΟΔΗΓΟΣ ΔΙΑΙΤΑΣ ΜΕΡΑ ΠΑΡΑ ΜΕΡΑ ΜΕ ΘΕΡΜΙΔΕΣ Με Συνταγές για Γεύματα , Σαλάτες , Σμούθις και Φρέσκους Χυμούς", "Gift: every-other-day diet guide with calories — recipes for meals, salads, smoothies, and fresh juices"),
    ("M ειώνει το άγχος και ηρεμεί το νευρικό σύστημα", "Reduces stress and calms the nervous system"),
    ("Τονώνει το νευρικό σύστημα και είναι αντιγηραντικό", "Tones the nervous system and is anti-aging"),
    ("Συμβάλλει στην καταστολή των κρίσεων πανικού , φοβιών και ανασφαλειών", "Supports calming panic attacks, fears, and insecurities"),
    ("Κατά της αλλεργικής ρινίτιδας & λοιπών αλλεργιών", "Supports allergic rhinitis and other allergies"),
    ("Αποβάλλει τα βαρέα μέταλλα από τον οργανισμό όπως τα κατάλοιπα του καπνίσματος", "Supports elimination of heavy metals, including smoking residues"),
    ("Συμβάλλει στην ρύθμιση των ορμονών και στην μείωση των προβλημάτων της περιόδου ( εμμηνόπαυσης )", "Supports hormone balance and reducing period / menopause issues"),
    ("Συμβάλλει στην καλύτερη λειτουργία των πνευμόνων", "Supports better lung function"),
    ("Ενισχύει την σεξουαλική δράση και την μυϊκή δύναμη", "Supports sexual performance and muscle strength"),
    ("Συμβάλλει στην αύξηση της λίμπιντο , στην ανανεώση της σεξουαλικής διάθεσης , στην ενδυνάμωση της στύσης και για την ενίσχυση της γονιμότητας", "Supports libido, sexual desire, erection strength, and fertility"),
    ("Συμβάλλει στην ενίσχυση της αθλητικής απόδοσης , την αύξηση της μυϊκής μάζας και της δύναμης", "Supports athletic performance, muscle mass, and strength"),
    ("Συμβάλλει στην υγεία του ουροποιητικού", "Supports urinary tract health"),
    ("Συμβάλλει στην βελτίωση της γνωστικής λειτουργίας", "Supports improved cognitive function"),
    ("Συμβάλλει στην ενίσχυση της άμυνας του ανοσοποιητικού", "Supports immune defense"),
    ("Συμβάλλει την απορρόφηση του σιδήρου", "Supports iron absorption"),
    ("Συμβάλει στην ενδυνάμωση των ανθρώπινων οστών", "Supports human bone strength"),
    ("Συμβάλλει στην μείωση της κούρασης και την κόπωσης", "Supports reducing tiredness and fatigue"),
    ("Συμβάλλει στη φυσιολογική λειτουργία του νευρικού συστήματος", "Supports normal nervous system function"),
    ("Για αναλυτικές πληροφορίες για τα συμπληρώματα YGIA Natural Health και τις δημοσιευμένεςεπιστημονικές μελέτες επισκευθείτε την ιστοσελίδα www.ygianaturalhealth.com", "For detailed product info and published studies visit www.ygianaturalhealth.com"),
    ("Αν χρειάζεστε οποιεσδήποτε εξιδικευμένες πληροφορίες για τις ιδιότητες , την χρήση ή την δοσολογία των συμπληρωμάτων της YGIA ο βοτανολόγος της εταιρείας είναι στην διάθεση σας", "For specialized info on properties, use, or dosage, YGIA’s herbalist is available"),
    ("Απλά τηλεφωνήστε στο 22610418 ή στείλτε email στο costas@ygianaturalhealth.com", "Call +357 22 610 418 or email costas@ygianaturalhealth.com"),
    ("Για οποιεσδήποτε απορίες τηλεφωνήστε στο 22610418 ή στείλτε email στο support@ygianaturalhealth.com", "For any questions call +357 22 610 418 or email support@ygianaturalhealth.com"),
    ("Τα συμπληρώματα διατροφής δεν πρέπει να χρησιμοποιούνται ως υποκατάστατα μιας ποικίλης , ισορροπημένης διατροφής ή υγιεινού τρόπου ζωής", "Food supplements should not replace a varied, balanced diet or healthy lifestyle"),
    ("Να φυλάσσεται μακριά από παιδιά . Κατάλληλο για χορτοφάγους και vegans. Δεν είναι κατάλληλα για εγκύους ή θηλάζουσες μητέρες", "Keep away from children. Suitable for vegetarians and vegans. Not suitable for pregnant or breastfeeding women"),
    ("Μην τα χρησιμοποιείσετε εάν έχει παραβιαστεί το καπάκι ή και η τσιμούχα ασφαλείας", "Do not use if the cap or safety seal is broken"),
    ("Αποποίηση ευθύνης : Αυτά τα προϊόντα δεν προορίζονται για τη διάγνωση ή τη θεραπεία , οποιασδήποτε ασθένειας", "Disclaimer: these products are not intended to diagnose or treat any disease"),
    ("Εκχύλισμα Φύλων Σέννας", "Senna leaf extract"),
    ("Ασκορβικό Οξύ", "Ascorbic Acid"),
    ("Βιταμίνη D 3", "Vitamin D3"),
    ("B ιταμίνη C", "Vitamin C"),
    ("A σκορβικό Οξύ", "Ascorbic Acid"),
    ("κάψουλες την ημέρα", "capsules per day"),
    ("κάψουλα την ημέρα", "capsule per day"),
    ("κάψουλα καθε 5 μέρες", "capsule every 5 days"),
    ("ή όπως συστήσει ο επαγγελματίας υγείας", "or as advised by a health professional"),
    ("Μετά την χρήση 90 ημερών συστήνεται διακοπή για 30 μέρες", "After 90 days of use, a 30-day break is recommended"),
    ("μετά το φαγητό", "after food"),
    ("πριν από κάθε γεύμα 20 με 30 λεπτά πριν το φαγητό με 2 ποτήρια νερό", "before each meal, 20–30 minutes before food with 2 glasses of water"),
    ("Συνολικά 3 κάψουλες την ημέρα", "Total 3 capsules per day"),
    ("Σε γυάλινο φιμε μπουκάλι", "In an amber glass bottle"),
    ("φυτικές κάψουλες", "plant capsules"),
    ("Προσφορά", "Offer"),
    ("ΔΡΑΣΕΙΣ", "ACTIONS"),
    ("ΔΟΣΟΛΟΓΙΑ", "DOSAGE"),
    ("ΣΥΣΤΑΤΙΚΑ", "INGREDIENTS"),
    ("ΣΥΣΚΕΥΑΣΙΑ", "PACKAGING"),
    ("ΑΣΦΑΛΕΙΑ", "SAFETY"),
    ("ΕΠΙΣΤΗΜΟΝΙΚΕΣ ΜΕΛΕΤΕΣ", "SCIENTIFIC STUDIES"),
    ("ΥΠΟΣΤΗΡΙΞΗ ΑΠΟ ΒΟΤΑΝΟΛΟΓΟ", "HERBALIST SUPPORT"),
    ("ΥΠΟΣΤΗΡΙΞΗ", "SUPPORT"),
    ("μέχρι", "up to"),
    ("φορές", "times"),
]

PHRASES.sort(key=lambda x: len(x[0]), reverse=True)


def translate(text: str) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    # Fix common PDF join glitches before phrase replace
    t = t.replace("απαλλαγμένααπό", "απαλλαγμένα από")
    t = t.replace("γεύσειςκαι", "γεύσεις και")
    t = t.replace("σεεγκατάστασεις", "σε εγκαταστάσεις")
    t = t.replace("εργαστήριομας", "εργαστήριό μας")
    t = t.replace("αξιόπιστουςπρομηθευτές", "αξιόπιστους προμηθευτές")
    t = t.replace("σεΠανεπιστημιακές", "σε Πανεπιστημιακές")
    t = t.replace("τωνβοτάνων", "των βοτάνων")
    t = t.replace("Πολλάσυμπληρώματα", "Πολλά συμπληρώματα")
    t = t.replace("σεβαριά", "σε βαριά")
    t = t.replace("φωςκαι", "φως και")
    t = t.replace("δημοσιευμένεςεπιστημονικές", "δημοσιευμένες επιστημονικές")
    for gr, en in PHRASES:
        t = t.replace(gr, en)
    # Dose patterns still partly Greek
    t = re.sub(r"(\d+)\s*με\s*(\d+)", r"\1 to \2", t)
    t = re.sub(r"(\d+)\s*μέχρι\s*(\d+)", r"\1 up to \2", t)
    t = re.sub(r"\((\d+)\s*x\s*(\d+)\s*times?\s*\)", r"(\1 x \2 times)", t)
    t = re.sub(r"\((\d+)\s*x\s*(\d+)\s*φορές\s*\)", r"(\1 x \2 times)", t)
    t = re.sub(r"\s+", " ", t).strip()
    # Drop leftover Greek letters if any remain (keep Latin/digits/punct)
    leftover = re.findall(r"[\u0370-\u03FF\u1F00-\u1FFF]+", t)
    if leftover and len("".join(leftover)) > 8:
        # Keep a note but strip dense Greek leftovers to English-safe text
        t = re.sub(r"[\u0370-\u03FF\u1F00-\u1FFF]+", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
    return t


def split_sections(block: str) -> dict[str, str]:
    labels = {
        "ACTIONS": "actions",
        "DOSAGE": "dosage",
        "INGREDIENTS": "ingredients",
        "PACKAGING": "packaging",
        "SAFETY": "safety",
        "ΔΡΑΣΕΙΣ": "actions",
        "ΔΟΣΟΛΟΓΙΑ": "dosage",
        "ΣΥΣΤΑΤΙΚΑ": "ingredients",
        "ΣΥΣΚΕΥΑΣΙΑ": "packaging",
        "ΑΣΦΑΛΕΙΑ": "safety",
    }
    # Find earliest label positions
    positions: list[tuple[int, str]] = []
    for label, key in labels.items():
        for m in re.finditer(rf"(?m)^\s*{re.escape(label)}\s*$", block):
            positions.append((m.start(), key))
        # also inline mid-line
        for m in re.finditer(rf"(?<!\w){re.escape(label)}(?!\w)", block):
            positions.append((m.start(), key))
    positions = sorted(set(positions), key=lambda x: x[0])
    # Deduplicate overlapping keys keeping first occurrence order
    seen = set()
    ordered: list[tuple[int, str]] = []
    for pos, key in positions:
        if key in seen:
            continue
        seen.add(key)
        ordered.append((pos, key))
    ordered.sort(key=lambda x: x[0])

    preamble_end = ordered[0][0] if ordered else len(block)
    preamble = block[:preamble_end].strip()
    out: dict[str, str] = {"preamble": preamble}
    for i, (pos, key) in enumerate(ordered):
        # skip the label itself
        rest = block[pos:]
        rest = re.sub(rf"^(?:{ '|'.join(map(re.escape, labels.keys())) })\s*", "", rest, count=1, flags=re.M)
        end = ordered[i + 1][0] - pos if i + 1 < len(ordered) else len(rest)
        # When end is relative to original block, recompute
        chunk_end = ordered[i + 1][0] if i + 1 < len(ordered) else len(block)
        chunk = block[pos:chunk_end]
        chunk = re.sub(
            rf"^(?:{'|'.join(map(re.escape, labels.keys()))})\s*",
            "",
            chunk,
            count=1,
            flags=re.M,
        ).strip()
        # Remove product title lines / offers that got glued
        out[key] = chunk
    return out


def clean_field(text: str, product_name: str, anchors: list[str]) -> str:
    t = text
    for a in anchors + [product_name]:
        t = re.sub(rf"(?im)^\s*{re.escape(a)}\s*$", "", t)
        t = re.sub(rf"(?i)\b{re.escape(a)}\b", "", t)
    t = re.sub(r"(?im)^\s*Offer\s*:?\s*.*$", "", t)
    t = re.sub(r"(?im)^\s*Προσφορά\s*:?\s*.*$", "", t)
    t = re.sub(r"(?im)^\s*1\s+.+\+\s*1\s+.+$", "", t)
    t = re.sub(r"(?im)^\s*\(Cistus.+$", "", t)
    t = re.sub(r"\n{2,}", "\n", t)
    return translate(t)


def _strip_prev_product_tail(backward: str) -> str:
    """Drop previous product's dose/ingredients/packaging; keep this product's pre-title text."""
    text = backward.strip()
    if not text:
        return ""
    bottles = list(re.finditer(r"(?m)^\s*60\s+φυτικές κάψουλες[^\n]*$", text))
    if len(bottles) >= 2:
        # Previous product ended at first bottle; remainder is this product's card/actions
        return text[bottles[0].end() :].strip()
    if len(bottles) == 1:
        after = text[bottles[0].end() :].strip()
        if not after:
            # Packaging at end → this product's title-at-end card
            return text
        # Only offers after bottle → still title-at-end
        offer_only = re.sub(
            r"(?s)(?:\n?\s*(?:Προσφορά|Offer|ΔΩΡΟ)[^\n]*|\n?\s*1\s+[^\n]*\+[^\n]*|\n?\s*\(Cistus[^\n]*\))*\Z",
            "",
            after,
        ).strip()
        if not offer_only:
            return text
        # Real following content → previous packaging + this product's actions
        return after
    return text


def _first_section_chunk(block: str, keys: tuple[str, ...]) -> str:
    """Return text under the first matching section label, stopping at the next label."""
    labels = {
        "actions": ("ΔΡΑΣΕΙΣ", "ACTIONS"),
        "dosage": ("ΔΟΣΟΛΟΓΙΑ", "DOSAGE"),
        "ingredients": ("ΣΥΣΤΑΤΙΚΑ", "INGREDIENTS"),
        "packaging": ("ΣΥΣΚΕΥΑΣΙΑ", "PACKAGING"),
        "safety": ("ΑΣΦΑΛΕΙΑ", "SAFETY"),
    }
    all_labs = [lab for labs in labels.values() for lab in labs]
    lab_re = "|".join(re.escape(x) for x in all_labs)
    for key in keys:
        for lab in labels[key]:
            m = re.search(rf"(?m)^\s*{re.escape(lab)}\s*$", block)
            if not m:
                continue
            after = block[m.end() :]
            stop = re.search(rf"(?m)^\s*(?:{lab_re})\s*$", after)
            chunk = after[: stop.start()] if stop else after
            return chunk.strip()
    return ""


def extract_products(raw: str) -> list[dict]:
    """Extract each product using title anchors; actions may sit before or after the title."""
    text = raw
    hits: list[tuple[int, int, str, str, list[str]]] = []
    for name, handle, anchors in PRODUCTS:
        found = None
        for a in anchors:
            # Only whole-line titles — never match inside "336 mgCurcumin 95% Extract"
            m = re.search(rf"(?m)^\s*{re.escape(a)}\s*$", text)
            if m:
                found = (m.start(), m.end(), a)
                break
        if not found:
            print(f"WARN: missing product anchor for {name}")
            continue
        start, end, _used = found
        hits.append((start, end, name, handle, anchors))

    hits.sort(key=lambda x: x[0])
    products: list[dict] = []

    intro_cut = 0
    m0 = re.search(r"Aποτελεσματική κατά των φλεγμονών", text)
    if m0:
        intro_cut = m0.start()

    footer = re.search(r"ΕΠΙΣΤΗΜΟΝΙΚΕΣ ΜΕΛΕΤΕΣ", text)
    footer_pos = footer.start() if footer else len(text)

    for i, (pos, title_end, name, handle, anchors) in enumerate(hits):
        prev_end = hits[i - 1][1] if i > 0 else intro_cut
        next_start = hits[i + 1][0] if i + 1 < len(hits) else footer_pos

        between = text[prev_end:pos].strip()
        forward = text[title_end:next_start].strip()
        # Drop previous product's dose/ing/pkg so `body` is only this product's pre-title text
        body = _strip_prev_product_tail(between)

        def actions_from(block: str) -> str:
            before = re.split(
                r"(?m)^\s*(?:ΔΟΣΟΛΟΓΙΑ|DOSAGE|ΣΥΣΤΑΤΙΚΑ|INGREDIENTS|ΣΥΣΚΕΥΑΣΙΑ|PACKAGING)\s*$",
                block,
                maxsplit=1,
            )[0]
            before = re.sub(r"(?m)^\s*(?:Προσφορά|Offer|ΔΩΡΟ).*$", "", before)
            before = re.sub(r"(?m)^\s*1\s+.+\+\s*1\s+.+$", "", before)
            labeled = _first_section_chunk(block, ("actions",))
            pre_act = re.split(r"(?m)^\s*(?:ΔΡΑΣΕΙΣ|ACTIONS)\s*$", before, maxsplit=1)[0]
            parts = [pre_act.strip(), labeled.strip() if labeled else ""]
            return "\n".join(p for p in parts if p)

        def trim_forward_meta(fwd: str) -> str:
            """Keep dose/ing/pkg/safety/offers; drop the next product's action bullets."""
            bottle_m = re.search(r"(?m)^\s*60\s+φυτικές κάψουλες[^\n]*$", fwd)
            if not bottle_m:
                lines = []
                for ln in fwd.splitlines():
                    s = ln.strip()
                    if (
                        lines
                        and re.search(r"[\u0370-\u03FF]", s)
                        and len(s) > 30
                        and not re.match(
                            r"^(ΔΟΣΟΛΟΓΙΑ|ΣΥΣΤΑΤΙΚΑ|ΣΥΣΚΕΥΑΣΙΑ|ΑΣΦΑΛΕΙΑ|Προσφορά|ΔΡΑΣΕΙΣ|ΣΥΣΤΑΤΙΚΑ)",
                            s,
                        )
                    ):
                        break
                    lines.append(ln)
                return "\n".join(lines).strip()
            keep = fwd[: bottle_m.end()]
            after = fwd[bottle_m.end() :]
            extra = []
            for ln in after.splitlines():
                s = ln.strip()
                if not s:
                    continue
                if re.match(
                    r"^(ΑΣΦΑΛΕΙΑ|SAFETY|Προσφορά|Offer|ΔΩΡΟ|\(Cistus|ΣΥΣΤΑΤΙΚΑ|INGREDIENTS)",
                    s,
                ):
                    extra.append(s)
                    continue
                if re.match(r"^1\s+.+\+", s) or re.match(r"^Η χρήση ", s):
                    extra.append(s)
                    continue
                if re.match(r"^\d+\s*mg\b", s, re.I):
                    extra.append(s)
                    continue
                if re.search(r"[\u0370-\u03FF]", s) and len(s) > 25:
                    break
            return (keep + "\n" + "\n".join(extra)).strip()

        # Title-at-end on THIS product's body only (after stripping prior packaging).
        body_core = re.sub(
            r"(?s)(?:\n\s*(?:Προσφορά|Offer|ΔΩΡΟ)[^\n]*)+\Z",
            "",
            body.strip(),
        )
        body_core = re.sub(r"(?s)(?:\n\s*1\s+[^\n]*\+[^\n]*)+\Z", "", body_core)
        body_core = re.sub(r"(?s)(?:\n\s*\(Cistus[^\n]*\)\s*)+\Z", "", body_core)
        title_at_end = bool(
            re.search(
                r"(?s)(?:ΣΥΣΚΕΥΑΣΙΑ|PACKAGING)\s*\n\s*60\s+φυτικές κάψουλες[^\n]*\s*\Z",
                body_core.strip(),
            )
        )

        if title_at_end:
            card = body_core
            actions_raw = actions_from(card)
            dosage = clean_field(_first_section_chunk(card, ("dosage",)), name, anchors)
            ingredients = clean_field(
                _first_section_chunk(card, ("ingredients",)), name, anchors
            )
            packaging = clean_field(
                _first_section_chunk(card, ("packaging",)), name, anchors
            )
            safety = clean_field(
                _first_section_chunk(trim_forward_meta(forward), ("safety",)),
                name,
                anchors,
            )
            if not safety:
                safety = clean_field(
                    _first_section_chunk(forward, ("safety",)), name, anchors
                )
            full = (card + "\n" + name + "\n" + trim_forward_meta(forward)).strip()
        else:
            meta = trim_forward_meta(forward)
            if not _first_section_chunk(meta, ("dosage",)) and _first_section_chunk(
                forward, ("dosage",)
            ):
                meta = forward
            actions_raw = (actions_from(body) + "\n" + actions_from(meta)).strip()
            dosage = clean_field(_first_section_chunk(meta, ("dosage",)), name, anchors)
            ingredients = clean_field(
                _first_section_chunk(meta, ("ingredients",)), name, anchors
            )
            packaging = clean_field(
                _first_section_chunk(meta, ("packaging",)), name, anchors
            )
            safety = clean_field(_first_section_chunk(meta, ("safety",)), name, anchors)
            if not ingredients:
                ingredients = clean_field(
                    _first_section_chunk(forward, ("ingredients",)), name, anchors
                )
            full = (body + "\n" + name + "\n" + meta).strip()

        # Fallback: dose/ingredients sometimes sit in pre-title body (Relive)
        if not dosage:
            dosage = clean_field(_first_section_chunk(body, ("dosage",)), name, anchors)
        if not ingredients:
            ingredients = clean_field(
                _first_section_chunk(body, ("ingredients",)), name, anchors
            )
        if not packaging:
            packaging = clean_field(
                _first_section_chunk(body, ("packaging",)), name, anchors
            )

        # Vit D3 1000: action text sits after packaging in the booklet
        if name.startswith("Vitamin D3") and len(actions_raw.strip()) < 40:
            after_pkg = forward
            bm = re.search(r"(?m)^\s*60\s+φυτικές κάψουλες[^\n]*$", forward)
            if bm:
                after_pkg = forward[bm.end() :]
            extra = clean_field(actions_from(after_pkg), name, anchors)
            if len(extra) > len(actions_raw):
                actions_raw = extra

        actions = clean_field(actions_raw, name, anchors)
        for junk in ("DOSAGE", "INGREDIENTS", "PACKAGING", "ACTIONS", "SAFETY", "Offer"):
            actions = re.sub(rf"\b{junk}\b", " ", actions)
        actions = re.sub(r"\s+", " ", actions).strip(" .")

        # Manual completes for awkward PDF layout leftovers
        HAND = {
            "Relive": {
                "dosage": "1 capsule per day",
                "ingredients": (
                    "225 mg Organic Cistus Creticus Extract 10:1, "
                    "100 mg Griffonia Simplicifolia Extract (30% 5-HTP), "
                    "60 mg Ginkgo Biloba (24% Flavone Glycosides & 6% Terpene Lactones), "
                    "60 mg Organic Olive Leaf 10:1, "
                    "55 mg Cordyceps Sinensis (40% Polysaccharides)"
                ),
            },
            "Vitamin D3 1000 IU with Vitamin C": {
                "actions": (
                    "Supports bone strength. Supports collagen production. "
                    "Improves mood and provides energy. Supports muscle strength. "
                    "Vitamin D is important for calcium and phosphorus absorption and bone health; "
                    "deficiency has been linked with autoimmune disease, cancer, and heart disease."
                ),
            },
            "Magnesium Glycinate": {
                "ingredients": "630 mg Magnesium Glycinate",
            },
        }
        fix = HAND.get(name)
        if fix:
            for k, v in fix.items():
                if k == "actions" and len(actions) < 40:
                    actions = v
                elif k == "dosage" and not dosage:
                    dosage = v
                elif k == "ingredients" and (not ingredients or len(ingredients) < 20):
                    ingredients = v

        if packaging:
            mpkg = re.search(r"60\s+(?:plant|φυτικές)[^.]*", packaging, re.I)
            packaging = (
                clean_field(mpkg.group(0), name, anchors) if mpkg else packaging[:100]
            )
        if not packaging:
            mpkg = re.search(r"60\s+φυτικές κάψουλες[^\n]+", full)
            if mpkg:
                packaging = clean_field(mpkg.group(0), name, anchors)

        products.append(
            {
                "name": name,
                "handle": handle,
                "actions": actions,
                "dosage": dosage,
                "ingredients": ingredients,
                "packaging": packaging,
                "safety": safety,
                "raw": full,
            }
        )
    return products


def company_intro(raw: str) -> str:
    m = re.search(r"100% ΦΥΣΙΚΑ[\s\S]+?διεισδύσει στο προϊόν", raw)
    chunk = m.group(0) if m else raw[:1200]
    return translate(chunk)


def make_faqs(products: list[dict], intro: str) -> list[dict]:
    faqs = []
    faqs.append(
        {
            "id": str(uuid.uuid4()),
            "question": "What makes YGIA supplements special? (quality, capsules, packaging)",
            "answer": intro
            + " Pullulan (tapioca) vegan capsules. Recyclable amber glass bottles. Based on university research, traditional and holistic herbalism.",
            "product": "YGIA quality",
            "tags": [FAQ_TAG, "quality", "company"],
        }
    )
    faqs.append(
        {
            "id": str(uuid.uuid4()),
            "question": "Who can I call for specialized herbalist advice on YGIA products?",
            "answer": "For specialized properties, use, or dosage, call the YGIA herbalist on +357 22 610 418 or email costas@ygianaturalhealth.com. General support: support@ygianaturalhealth.com.",
            "product": "Support",
            "tags": [FAQ_TAG, "support"],
        }
    )

    for p in products:
        name = p["name"]
        actions = p["actions"] or "See product page for details."
        dosage = p["dosage"] or "Follow the label or ask a health professional."
        ingredients = p["ingredients"] or "See product label."
        packaging = p["packaging"] or "Plant capsules in amber glass."
        safety = p["safety"]

        faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": f"What is {name} for? What does it do?",
                "answer": f"{name} — from the YGIA health professionals booklet: {actions}",
                "product": name,
                "tags": [FAQ_TAG, "actions", "use"],
            }
        )
        faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": f"How do I take {name}? What is the dosage?",
                "answer": f"Suggested dosage for {name}: {dosage}. Packaging: {packaging}."
                + (f" Safety note: {safety}" if safety else ""),
                "product": name,
                "tags": [FAQ_TAG, "dosage"],
            }
        )
        faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": f"What are the ingredients in {name}?",
                "answer": f"{name} ingredients (professional booklet): {ingredients}. {packaging}",
                "product": name,
                "tags": [FAQ_TAG, "ingredients"],
            }
        )
        # Combined deep card for RAG
        faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": f"{name} full professional product profile (actions, dose, ingredients)",
                "answer": (
                    f"Product: {name}.\n"
                    f"Actions / benefits: {actions}\n"
                    f"Dosage: {dosage}\n"
                    f"Ingredients: {ingredients}\n"
                    f"Packaging: {packaging}"
                    + (f"\nSafety: {safety}" if safety else "")
                ),
                "product": name,
                "tags": [FAQ_TAG, "full-profile"],
            }
        )
    return faqs


def enrich_pages(store: dict, products: list[dict], intro: str) -> int:
    pages = store["pages"]
    by_handle = {
        p["url"].replace("/products/", "").lower(): p
        for p in pages
        if p.get("url", "").startswith("/products/")
    }
    enriched = 0

    # Company page
    pro_url = "/pages/ygia-professional-booklet"
    existing = next((p for p in pages if p.get("url") == pro_url), None)
    body = (
        "YGIA Natural Health — Professional booklet for health practitioners (23.1.23).\n"
        + intro
        + "\n\nProducts covered: "
        + ", ".join(p["name"] for p in products)
        + ".\nSource: 23.1.23 YGIA presentation per product — health professionals."
    )
    page_entry = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "url": pro_url,
        "title": "YGIA Professional Booklet — Health Practitioners",
        "description": "Full professional presentation: actions, dosage, and ingredients for key YGIA products.",
        "keywords": ["professional", "booklet", "dosage", "ingredients", "actions", "ygia"],
        "content": body,
        "sections": [
            {
                "id": "quality",
                "title": "Quality & packaging",
                "text": intro,
            }
        ]
        + [
            {
                "id": re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-"),
                "title": p["name"],
                "text": (
                    f"Actions: {p['actions']}. Dosage: {p['dosage']}. "
                    f"Ingredients: {p['ingredients']}. Packaging: {p['packaging']}."
                    + (f" Safety: {p['safety']}" if p["safety"] else "")
                ),
            }
            for p in products
        ],
        "scannedAt": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        idx = pages.index(existing)
        pages[idx] = {**existing, **page_entry}
    else:
        pages.append(page_entry)

    for p in products:
        if not p["handle"]:
            continue
        page = by_handle.get(p["handle"].lower())
        if not page:
            print(f"WARN: no Shopify page for handle {p['handle']} ({p['name']})")
            continue
        block = (
            f"\n\n--- Professional booklet (health practitioners) ---\n"
            f"Product: {p['name']}\n"
            f"Actions / benefits: {p['actions']}\n"
            f"Dosage: {p['dosage']}\n"
            f"Ingredients: {p['ingredients']}\n"
            f"Packaging: {p['packaging']}\n"
        )
        if p["safety"]:
            block += f"Safety: {p['safety']}\n"
        content = page.get("content") or ""
        # Replace previous booklet block if re-running
        content = re.sub(
            r"\n*--- Professional booklet \(health practitioners\) ---[\s\S]*?(?=\n--- |\Z)",
            "",
            content,
        ).rstrip()
        page["content"] = content + block
        kws = list(page.get("keywords") or [])
        for kw in ["professional", "dosage", "ingredients", "actions", FAQ_TAG]:
            if kw not in kws:
                kws.append(kw)
        page["keywords"] = kws
        sections = list(page.get("sections") or [])
        sections = [s for s in sections if s.get("id") != "pro-booklet"]
        sections.append(
            {
                "id": "pro-booklet",
                "title": "Professional booklet — actions, dose, ingredients",
                "text": (
                    f"{p['actions']} Dosage: {p['dosage']}. "
                    f"Ingredients: {p['ingredients']}. {p['packaging']}"
                    + (f" Safety: {p['safety']}" if p["safety"] else "")
                ),
            }
        )
        page["sections"] = sections
        page["scannedAt"] = datetime.now(timezone.utc).isoformat()
        enriched += 1
    store["pages"] = pages
    return enriched


def main() -> None:
    raw = CLEAN.read_text(encoding="utf-8")
    products = extract_products(raw)
    intro = company_intro(raw)
    print(f"Parsed {len(products)} products")
    for p in products:
        print(
            f"  - {p['name']}: actions={len(p['actions'])} dose={len(p['dosage'])} "
            f"ing={len(p['ingredients'])} pkg={len(p['packaging'])}"
        )
        if len(p["actions"]) < 30:
            print(f"    WARN short actions: {p['actions']!r}")

    faqs = make_faqs(products, intro)
    store = json.loads(STORE.read_text(encoding="utf-8"))

    # Remove previous booklet FAQs for idempotent re-ingest
    before = len(store.get("faqs") or [])
    store["faqs"] = [
        f for f in store.get("faqs") or [] if FAQ_TAG not in (f.get("tags") or [])
    ]
    store["faqs"].extend(faqs)
    enriched = enrich_pages(store, products, intro)
    store["updatedAt"] = datetime.now(timezone.utc).isoformat()

    # Backup
    bak = STORE.with_suffix(".json.bak-pro-booklet")
    if not bak.exists():
        bak.write_text(STORE.read_text(encoding="utf-8"), encoding="utf-8")

    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    # Dump parsed for inspection
    out = ROOT / "data" / "ygia-pro-booklet-parsed.json"
    out.write_text(
        json.dumps({"intro": intro, "products": products, "faqCount": len(faqs)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        f"FAQs: removed old booklet tags, added {len(faqs)} (store faqs {before} -> {len(store['faqs'])})"
    )
    print(f"Enriched product pages: {enriched}")
    print(f"Wrote {STORE} and {out}")


if __name__ == "__main__":
    main()
