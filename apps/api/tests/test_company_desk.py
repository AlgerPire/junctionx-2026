from app.services.company_desk import reply_to_company_ask

BRIEFS = [
    {
        "id": 1,
        "title": "Data Analyst",
        "plain_summary": "Fix energy reporting with SQL",
        "status": "published",
    },
    {
        "id": 2,
        "title": "Ward Coordinator",
        "plain_summary": "Organise ward rotas",
        "status": "draft",
    },
]

CANDIDATES = [
    {
        "brief_id": 1,
        "brief_title": "Data Analyst",
        "seeker_id": 11,
        "seeker_alias": "Seeker #G01",
        "bucket": "strong",
    },
    {
        "brief_id": 1,
        "brief_title": "Data Analyst",
        "seeker_id": 12,
        "seeker_alias": "Seeker #G02",
        "bucket": "good",
    },
]


def test_new_brief_carries_first_message() -> None:
    reply = reply_to_company_ask(
        "We need a Python developer for our energy team",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "new_brief"
    assert reply.href is not None
    assert reply.href.startswith("/company/brief/new?first=")
    assert "Python" in reply.href


def test_candidates_for_named_brief() -> None:
    reply = reply_to_company_ask(
        "Show candidates for the data analyst role",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "brief"
    assert reply.href == "/company/briefs/1"


def test_invite_by_alias() -> None:
    reply = reply_to_company_ask(
        "Invite Seeker #G01 to talk",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "invite"
    assert reply.href == "/company/briefs/1?invite=11"
    assert reply.seeker_id == 11


def test_candidate_profile_by_alias() -> None:
    reply = reply_to_company_ask(
        "Open the profile for Seeker G02",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "candidate"
    assert reply.href == "/company/briefs/1?seeker=12"


def test_inbox_route() -> None:
    reply = reply_to_company_ask(
        "Open my inbox requests",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=3,
    )
    assert reply.action == "inbox"
    assert reply.href == "/company/inbox"
    assert "3" in reply.answer


def test_fallback_has_no_forced_href() -> None:
    reply = reply_to_company_ask(
        "hello there",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "none"
    assert reply.href is None


def test_off_topic_lists_capabilities() -> None:
    reply = reply_to_company_ask(
        "What is the weather in Espoo today?",
        briefs=BRIEFS,
        candidates=CANDIDATES,
        inbox_open=0,
    )
    assert reply.action == "none"
    assert reply.href is None
    assert "I'm not sure what you are talking about" in reply.answer
    assert "draft a new hiring job" in reply.answer
    assert "open candidates for a role" in reply.answer
    assert "invite someone by alias" in reply.answer
    assert "check your inbox" in reply.answer
    assert "open your job list" in reply.answer
