BEGIN;

-- ============================================================
-- Новые игроки (только отсутствующие — 9 из 23)
-- ============================================================

INSERT INTO "Player" (id, name, slug, "createdAt", "updatedAt") VALUES
('p' || substr(md5('prohor-brana'), 1, 22), 'Прохор Брана', 'prohor-brana', NOW(), NOW()),
('p' || substr(md5('grigoriy-sherstnev'), 1, 22), 'Григорий Шерстнев', 'grigoriy-sherstnev', NOW(), NOW()),
('p' || substr(md5('sergey-moskovskiy'), 1, 22), 'Сергей Московский', 'sergey-moskovskiy', NOW(), NOW()),
('p' || substr(md5('polina-blinova'), 1, 22), 'Полина Блинова', 'polina-blinova', NOW(), NOW()),
('p' || substr(md5('stanislav-lauk-dubitskiy'), 1, 22), 'Станислав Лаук-Дубицкий', 'stanislav-lauk-dubitskiy', NOW(), NOW()),
('p' || substr(md5('ivan-sheptyakov'), 1, 22), 'Иван Шептяков', 'ivan-sheptyakov', NOW(), NOW()),
('p' || substr(md5('kseniya-pronina'), 1, 22), 'Ксения Пронина', 'kseniya-pronina', NOW(), NOW()),
('p' || substr(md5('darya-timoshenko-da'), 1, 22), 'Дарья Тимошенко', 'darya-timoshenko-da', NOW(), NOW()),
('p' || substr(md5('snezhnaya-anna'), 1, 22), 'Снежная Анна', 'snezhnaya-anna', NOW(), NOW());

-- ============================================================
-- PlayerTeamSeason (24)
-- Существующие игроки используют реальные ID из БД
-- ============================================================

INSERT INTO "PlayerTeamSeason" (id, "playerId", "teamSeasonId", role, "isPlaying", "joinedAt") VALUES
-- СТИХИ НАРОДА (cmmnkoazqhn7g1ehip)
('pts' || substr(md5('pts-prohor-brana'), 1, 20), 'p' || substr(md5('prohor-brana'), 1, 22), 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-denis-piklyaev'), 1, 20), 'cmmnkoaugo20fmjpl6', 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-grigoriy-sherstnev'), 1, 20), 'p' || substr(md5('grigoriy-sherstnev'), 1, 22), 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-sergey-zhuravlev'), 1, 20), 'cmmnkoav538k9mz3tl', 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-sergey-vedurg'), 1, 20), 'cmmnkoav490loif22x', 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-darya-piotrovskaya'), 1, 20), 'cmmnkoav4o4l4y6d1w', 'cmmnkoazqhn7g1ehip', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-elena-panteleymonova'), 1, 20), 'cmmnkoavccsq2cpe08', 'cmmnkoazqhn7g1ehip', 'COACH', false, NOW()),
-- НеСТИХай (cmmnkoasgrw02g1q57)
('pts' || substr(md5('pts-sergey-moskovskiy'), 1, 20), 'p' || substr(md5('sergey-moskovskiy'), 1, 22), 'cmmnkoasgrw02g1q57', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-polina-blinova'), 1, 20), 'p' || substr(md5('polina-blinova'), 1, 22), 'cmmnkoasgrw02g1q57', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-stanislav-lauk'), 1, 20), 'p' || substr(md5('stanislav-lauk-dubitskiy'), 1, 22), 'cmmnkoasgrw02g1q57', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-ivan-sheptyakov'), 1, 20), 'p' || substr(md5('ivan-sheptyakov'), 1, 22), 'cmmnkoasgrw02g1q57', 'PLAYER', true, NOW()),
-- Шатуны (cmmnkoasfc9eu3e856)
('pts' || substr(md5('pts-nikita-sokolov'), 1, 20), 'cmmnkoau8zpsrj1hpd', 'cmmnkoasfc9eu3e856', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-yastrebov'), 1, 20), 'cmmnkoau1nwz0lzhem', 'cmmnkoasfc9eu3e856', 'PLAYER', true, NOW()),
-- ДА (cmmnkoazqdhtmmp9kr)
('pts' || substr(md5('pts-varvara-gerasimovich'), 1, 20), 'cmmnkoaup7esnd1uww', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-dmitriy-svistunov'), 1, 20), 'cmmnkoav14olnoa3x0', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-aleksey-kolchugin'), 1, 20), 'cmmnkoav175s9vjy3r', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-ekaterina-yurgel'), 1, 20), 'cmmnkoauauk3dj9ii9', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-kseniya-pronina'), 1, 20), 'p' || substr(md5('kseniya-pronina'), 1, 22), 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-kseniya-ilina'), 1, 20), 'cmmnkoauay34a2lp0r', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-artyom-birlov'), 1, 20), 'cmmnkoaug93g09k76d', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-zlata-chern'), 1, 20), 'cmmnkoav1rut77876u', 'cmmnkoazqdhtmmp9kr', 'PLAYER', true, NOW()),
('pts' || substr(md5('pts-darya-timoshenko-da'), 1, 20), 'p' || substr(md5('darya-timoshenko-da'), 1, 22), 'cmmnkoazqdhtmmp9kr', 'ASSISTANT_COACH', false, NOW()),
-- Маски (cmmnkoasgkim80dlys)
('pts' || substr(md5('pts-snezhnaya-anna'), 1, 20), 'p' || substr(md5('snezhnaya-anna'), 1, 22), 'cmmnkoasgkim80dlys', 'PLAYER', true, NOW());

-- ============================================================
-- MatchLineup (76)
-- ============================================================

INSERT INTO "MatchLineup" (id, "matchId", "teamSeasonId", "playerId", status) VALUES
-- Match 1: СТИХИ НАРОДА vs Метаморфоза (cmmnkoazr67xhz77d6)
('ml' || substr(md5('ml1-prohor-brana'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'p' || substr(md5('prohor-brana'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml1-denis-piklyaev'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'cmmnkoaugo20fmjpl6', 'UNUSED'),
('ml' || substr(md5('ml1-grigoriy-sherstnev'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'p' || substr(md5('grigoriy-sherstnev'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml1-sergey-zhuravlev'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'cmmnkoav538k9mz3tl', 'UNUSED'),
('ml' || substr(md5('ml1-sergey-vedurg'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'cmmnkoav490loif22x', 'UNUSED'),
('ml' || substr(md5('ml1-darya-piotrovskaya'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'cmmnkoav4o4l4y6d1w', 'UNUSED'),
('ml' || substr(md5('ml1-elena-panteleymonova'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoazqhn7g1ehip', 'cmmnkoavccsq2cpe08', 'UNUSED'),
('ml' || substr(md5('ml1-natalya-vereskova'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoaunmtr4dk6g5', 'UNUSED'),
('ml' || substr(md5('ml1-nikolay-ratnikov'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoav0zq3r2jlya', 'UNUSED'),
('ml' || substr(md5('ml1-ekaterina-vesolkina'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoav0umpbo3511', 'UNUSED'),
('ml' || substr(md5('ml1-anastasiya-zadorova'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoavdxfirbhe2b', 'UNUSED'),
('ml' || substr(md5('ml1-dmitriy-beseda'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoauzitu1uqgsv', 'UNUSED'),
('ml' || substr(md5('ml1-alisa-orlova'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoauzre4hepmdu', 'UNUSED'),
('ml' || substr(md5('ml1-hytec'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoave4f96n92ai', 'UNUSED'),
('ml' || substr(md5('ml1-kristina-tersenova'), 1, 21), 'cmmnkoazr67xhz77d6', 'cmmnkoasgmljhqden5', 'cmmnkoaui23osl1nhp', 'UNUSED'),

-- Match 2: ОПГ vs НеСТИХай (cmmnkoazr7tn1v7twc)
('ml' || substr(md5('ml2-marina-vernigorova'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav38442rgul0', 'UNUSED'),
('ml' || substr(md5('ml2-linn-voron'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav28ky3m9164', 'UNUSED'),
('ml' || substr(md5('ml2-ramona-laydon'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav2y06s38k5y', 'UNUSED'),
('ml' || substr(md5('ml2-olga-vnukova'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav2gleof5jex', 'UNUSED'),
('ml' || substr(md5('ml2-aksinya-domeo'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav2czpg91bbg', 'UNUSED'),
('ml' || substr(md5('ml2-mariya-skokova'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav338qt2yj3w', 'UNUSED'),
('ml' || substr(md5('ml2-darya-chornya'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmmnkoav2ndveapttt', 'UNUSED'),
('ml' || substr(md5('ml2-ninel'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgw3g9z7ly4', 'cmnn97p8w000001o9ew886cp5', 'UNUSED'),
('ml' || substr(md5('ml2-sergey-moskovskiy'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgrw02g1q57', 'p' || substr(md5('sergey-moskovskiy'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml2-polina-blinova'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgrw02g1q57', 'p' || substr(md5('polina-blinova'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml2-stanislav-lauk'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgrw02g1q57', 'p' || substr(md5('stanislav-lauk-dubitskiy'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml2-ivan-sheptyakov'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgrw02g1q57', 'p' || substr(md5('ivan-sheptyakov'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml2-aleksandr-zezyulin'), 1, 21), 'cmmnkoazr7tn1v7twc', 'cmmnkoasgrw02g1q57', 'cmmnkoau05ocn91myv', 'UNUSED'),

-- Match 3: Шатуны vs In Folio (cmmnkoazr90faj1ogq)
('ml' || substr(md5('ml3-kostya-denisov'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoau1lfx2it833', 'UNUSED'),
('ml' || substr(md5('ml3-katya-chemodurova'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoauddylvp8gdt', 'UNUSED'),
('ml' || substr(md5('ml3-nastya-bar'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoav8lymd2oygw', 'UNUSED'),
('ml' || substr(md5('ml3-ekaterina-ktzh'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoavcmev0uzg9f', 'UNUSED'),
('ml' || substr(md5('ml3-nika-bozhedomka'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoavcqrvkjcz2f', 'UNUSED'),
('ml' || substr(md5('ml3-masha-durmanova'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoauo7leg7sap9', 'UNUSED'),
('ml' || substr(md5('ml3-nikita-sokolov'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoau8zpsrj1hpd', 'UNUSED'),
('ml' || substr(md5('ml3-yastrebov'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoau1nwz0lzhem', 'UNUSED'),
('ml' || substr(md5('ml3-vanya-simak'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasfc9eu3e856', 'cmmnkoavctqabrmfu6', 'UNUSED'),
('ml' || substr(md5('ml3-kristina-usova'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoau6qp58n8vwl', 'UNUSED'),
('ml' || substr(md5('ml3-andrey-adyakov'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoauooet7rsglq', 'UNUSED'),
('ml' || substr(md5('ml3-adam-gasiev'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoaudnt03s9rar', 'UNUSED'),
('ml' || substr(md5('ml3-katiny-ne-melochi'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoavaa5ss4qims', 'UNUSED'),
('ml' || substr(md5('ml3-sofya-besedina'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoavagp59rohw7', 'UNUSED'),
('ml' || substr(md5('ml3-anna-tihonova'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoav9kidtck7l2', 'UNUSED'),
('ml' || substr(md5('ml3-polina-pehtereva'), 1, 21), 'cmmnkoazr90faj1ogq', 'cmmnkoasgfe2oai7w7', 'cmmnkoauu4agj4enlt', 'UNUSED'),

-- Match 4: ДА vs Поэтория (cmmnkoazraw9tc1fwq)
('ml' || substr(md5('ml4-varvara-gerasimovich'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoaup7esnd1uww', 'UNUSED'),
('ml' || substr(md5('ml4-dmitriy-svistunov'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoav14olnoa3x0', 'UNUSED'),
('ml' || substr(md5('ml4-aleksey-kolchugin'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoav175s9vjy3r', 'UNUSED'),
('ml' || substr(md5('ml4-ekaterina-yurgel'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoauauk3dj9ii9', 'UNUSED'),
('ml' || substr(md5('ml4-kseniya-pronina'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'p' || substr(md5('kseniya-pronina'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml4-kseniya-ilina'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoauay34a2lp0r', 'UNUSED'),
('ml' || substr(md5('ml4-artyom-birlov'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoaug93g09k76d', 'UNUSED'),
('ml' || substr(md5('ml4-zlata-chern'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'cmmnkoav1rut77876u', 'UNUSED'),
('ml' || substr(md5('ml4-darya-timoshenko'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoazqdhtmmp9kr', 'p' || substr(md5('darya-timoshenko-da'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml4-mari'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauxxmsly3p2j', 'UNUSED'),
('ml' || substr(md5('ml4-aleksandr-zhukovets'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauxntfyppxrw', 'UNUSED'),
('ml' || substr(md5('ml4-artem-hrapov'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauy6vm9pmnhs', 'UNUSED'),
('ml' || substr(md5('ml4-alex-leto'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauyepan0r2km', 'UNUSED'),
('ml' || substr(md5('ml4-sasha-yudin'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauyjetrnav38', 'UNUSED'),
('ml' || substr(md5('ml4-ivan-nazarov'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoauyojn8q5ml2', 'UNUSED'),
('ml' || substr(md5('ml4-rinata-rasskazova'), 1, 21), 'cmmnkoazraw9tc1fwq', 'cmmnkoasgy98naaypz', 'cmmnkoavd51k7zhixb', 'UNUSED'),

-- Match 5: РЫБА vs Маски (cmmnkoazrbr28tb6i3)
('ml' || substr(md5('ml5-petr-kifa'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoatux5ikc1pjo', 'UNUSED'),
('ml' || substr(md5('ml5-evgeniy-lesin'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoatv8d9ean12m', 'UNUSED'),
('ml' || substr(md5('ml5-sergey-sinyakov'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoatw0g3bl0s1x', 'UNUSED'),
('ml' || substr(md5('ml5-svetlana-nosova'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoau5nrga3ebvp', 'UNUSED'),
('ml' || substr(md5('ml5-andrey-chemodanov'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoatv1j7skxvq2', 'UNUSED'),
('ml' || substr(md5('ml5-sasha-kolidenko'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoav5ez1x3yuxf', 'UNUSED'),
('ml' || substr(md5('ml5-yuliya-koloskova'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoav5k4gese7ep', 'UNUSED'),
('ml' || substr(md5('ml5-denis-chehonatskiy'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoatundjkmbgkl', 'UNUSED'),
('ml' || substr(md5('ml5-olga-tananko'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasfj5s7pffos', 'cmmnkoavbbbu4yzlw0', 'UNUSED'),
('ml' || substr(md5('ml5-snezhnaya-anna'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'p' || substr(md5('snezhnaya-anna'), 1, 22), 'UNUSED'),
('ml' || substr(md5('ml5-alyona-mosina'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoaupkt5qhiqmf', 'UNUSED'),
('ml' || substr(md5('ml5-ivan-pavlov'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoaurh6yzekvqs', 'UNUSED'),
('ml' || substr(md5('ml5-tana-ket'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoau2yizww3irj', 'UNUSED'),
('ml' || substr(md5('ml5-darya-kulagina'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoav8p204fs8c0', 'UNUSED'),
('ml' || substr(md5('ml5-vasil-tovchennikov'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoatzbrrgcbfeo', 'UNUSED'),
('ml' || substr(md5('ml5-darya-bekeshko'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoaul3ye422j61', 'UNUSED'),
('ml' || substr(md5('ml5-polsha-vishnevskaya'), 1, 21), 'cmmnkoazrbr28tb6i3', 'cmmnkoasgkim80dlys', 'cmmnkoavbfkq564fwm', 'UNUSED');

COMMIT;
