import hashlib
import hmac
import shutil
import time
from pathlib import Path

from app.domain.conversion.ports import StoredObject


def sign_key(key: str, expires_at: int, secret: str) -> str:
    message = f"{key}:{expires_at}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


class LocalStorage:
    def __init__(
        self,
        root: str | Path,
        public_base_url: str,
        ttl_seconds: int,
        signing_secret: str,
    ) -> None:
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)
        self._base = public_base_url.rstrip("/")
        self._ttl = ttl_seconds
        self._secret = signing_secret

    def upload(self, path: Path, key: str, content_type: str) -> StoredObject:
        destination = self._root / key
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)
        expires_at = int(time.time()) + self._ttl
        signature = sign_key(key, expires_at, self._secret)
        return StoredObject(
            key=key,
            url=f"{self._base}/{key}?expires={expires_at}&sig={signature}",
            size_bytes=destination.stat().st_size,
            expires_in_seconds=self._ttl,
        )

    def delete(self, key: str) -> None:
        target = self._root / key
        if target.exists():
            target.unlink()


class S3Storage:
    def __init__(
        self,
        *,
        endpoint_url: str | None,
        region: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        force_path_style: bool,
        ttl_seconds: int,
    ) -> None:
        import boto3
        from botocore.config import Config

        self._bucket = bucket
        self._ttl = ttl_seconds
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path" if force_path_style else "auto"},
            ),
        )

    def upload(self, path: Path, key: str, content_type: str) -> StoredObject:
        self._client.upload_file(
            str(path),
            self._bucket,
            key,
            ExtraArgs={"ContentType": content_type, "CacheControl": "private, max-age=0"},
        )
        url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=self._ttl,
        )
        return StoredObject(
            key=key,
            url=url,
            size_bytes=path.stat().st_size,
            expires_in_seconds=self._ttl,
        )

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)
